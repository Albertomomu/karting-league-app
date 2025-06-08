import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import SeasonSelector from '@/components/SeasonSelector';
import Toast from 'react-native-toast-message';

interface Pilot {
  id: string;
  name: string;
  avatar_url?: string;
}

interface Team {
  id: string;
  name: string;
  logo_url?: string;
}

interface DriverStanding {
  pilot: Pilot;
  totalPoints: number;
  team: Team | null;
}

interface TeamStanding {
  team: Team;
  totalPoints: number;
}

interface PilotTeamSeason {
  pilot_id: string;
  is_wildkart: boolean;
  team: Team;
  pilot: Pilot;
}

interface RaceResult {
  pilot_id: string;
  points: number;
  pilot: Pilot;
  race_id: string;
}

const TABS = [
  { key: 'drivers', title: 'Pilotos' },
  { key: 'teams', title: 'Equipos' },
];

// Colores podio: Oro, Plata, Bronce
const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function StandingsScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('drivers');
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [leagueIds, setLeagueIds] = useState<string[]>([]);
  const [driverStandings, setDriverStandings] = useState<any[]>([]);
  const [teamStandings, setTeamStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPilotId, setCurrentPilotId] = useState<string | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(null);

  // 0. Obtener el piloto de la sesión actual y su liga para la temporada seleccionada
  useEffect(() => {
    async function fetchCurrentPilotAndTeamAndLeague() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: pilot } = await supabase
        .from('pilot')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (pilot) {
        setCurrentPilotId(pilot.id);
        // Busca el equipo y la liga del piloto en la temporada seleccionada
        const { data: pts } = await supabase
          .from('pilot_team_season')
          .select('team_id, league_id')
          .eq('pilot_id', pilot.id)
          .eq('season_id', selectedSeasonId)
          .single();
        if (pts?.team_id) setCurrentTeamId(pts.team_id);
        if (pts?.league_id) setCurrentLeagueId(pts.league_id);
        else setCurrentLeagueId(null);
      } else {
        setCurrentPilotId(null);
        setCurrentTeamId(null);
        setCurrentLeagueId(null);
      }
    }
    fetchCurrentPilotAndTeamAndLeague();
  }, [selectedSeasonId]);

  // 1. Cargar temporadas
  useEffect(() => {
    async function fetchSeasons() {
      setLoading(true);
      setError(null);
      try {
        setDriverStandings([]);
        setTeamStandings([]);
        const { data, error } = await supabase
          .from('season')
          .select('id, name, is_active')
          .order('is_active', { ascending: false });
        if (error) throw error;
        setSeasons(data);
        setSelectedSeasonId(data?.[0]?.id || null);
      } catch (err) {
        setError('Error cargando temporadas');
      } finally {
        setLoading(false);
      }
    }
    fetchSeasons();
  }, []);

  // 2. Cargar solo la liga del piloto logueado para la temporada seleccionada
  useEffect(() => {
    if (currentLeagueId) {
      setLeagueIds([currentLeagueId]);
    } else {
      setLeagueIds([]);
    }
  }, [currentLeagueId]);

  // Limpiar standings al cambiar liga
  useEffect(() => {
    if (leagueIds.length > 0) {
      fetchStandings();
    } else {
      setDriverStandings([]);
      setTeamStandings([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueIds]);

  const fetchStandings = useCallback(async () => {
    if (!leagueIds.length) return;
    setLoading(true);
    setError(null);
    
    try {
      // 1. Obtener las carreras de las ligas
      const { data: races, error: raceError } = await supabase
        .from('race')
        .select('id')
        .in('league_id', leagueIds);
  
      if (raceError) throw raceError;
      const raceIds = races.map((r: { id: string }) => r.id);
  
      // 2. Obtener resultados de esas carreras
      let results: RaceResult[] = [];
      if (raceIds.length > 0) {
        const { data: resultsData, error } = await supabase
          .from('race_result')
          .select('pilot_id, points, pilot:pilot(id, name, avatar_url), race_id')
          .in('race_id', raceIds);
  
        if (error) throw error;
        results = resultsData
        .map((r: any) => {
          const pilot = Array.isArray(r.pilot) ? r.pilot[0] : r.pilot;
          if (!pilot) return null; // Filtra resultados sin piloto
          return {
            pilot_id: r.pilot_id,
            points: r.points,
            pilot,
            race_id: r.race_id,
          };
        })
        .filter(Boolean) as RaceResult[];
      }
  
      // 3. Relación piloto-equipo-temporada
      const { data: pilotTeams, error: ptsError } = await supabase
        .from('pilot_team_season')
        .select('pilot_id, is_wildkart, team:team_id(id, name, logo_url), pilot:pilot_id(id, name, avatar_url)')
        .eq('season_id', selectedSeasonId)
        .in('league_id', leagueIds);
  
      if (ptsError) throw ptsError;
      const typedPilotTeams: PilotTeamSeason[] = pilotTeams
      .map((pt: any) => {
        const team = Array.isArray(pt.team) ? pt.team[0] : pt.team;
        const pilot = Array.isArray(pt.pilot) ? pt.pilot[0] : pt.pilot;
        if (!team || !pilot) return null; // Filtra si falta equipo o piloto
        return {
          pilot_id: pt.pilot_id,
          is_wildkart: pt.is_wildkart,
          team,
          pilot,
        };
      })
      .filter(Boolean) as PilotTeamSeason[];
  
      // Mapeos con tipos explícitos
      const pilotTeamMap: Record<string, Team> = {};
      const wildkartMap: Record<string, boolean> = {};
      
      typedPilotTeams.forEach((row: PilotTeamSeason) => {
        if (row.team) {
          pilotTeamMap[row.pilot.id] = row.team;
        }
        wildkartMap[row.pilot.id] = row.is_wildkart;
      });
  
      // Clasificación de pilotos
      const standingsMap: Record<string, DriverStanding> = {};
      results.forEach((r: RaceResult) => {
        if (wildkartMap[r.pilot_id]) return;
        
        if (!standingsMap[r.pilot_id]) {
          standingsMap[r.pilot_id] = {
            pilot: r.pilot,
            totalPoints: 0,
            team: pilotTeamMap[r.pilot_id] || null,
          };
        }
        standingsMap[r.pilot_id].totalPoints += r.points || 0;
      });
  
      const standingsArr = Object.values(standingsMap).sort((a, b) =>
        b.totalPoints - a.totalPoints || a.pilot.name.localeCompare(b.pilot.name)
      );
      setDriverStandings(standingsArr);
  
      // Clasificación de equipos
      const teamMap: Record<string, TeamStanding> = {};
      results.forEach((r: RaceResult) => {
        const team = pilotTeamMap[r.pilot_id];
        if (!team) return;
  
        if (!teamMap[team.id]) {
          teamMap[team.id] = {
            team,
            totalPoints: 0,
          };
        }
        teamMap[team.id].totalPoints += r.points || 0;
      });
  
      const teamsArr = Object.values(teamMap).sort((a, b) =>
        b.totalPoints - a.totalPoints || a.team.name.localeCompare(b.team.name)
      );
      setTeamStandings(teamsArr);
  
      // ... resto del código de Toast
    } catch (err) {
      // ... manejo de errores
    } finally {
      setLoading(false);
    }
  }, [leagueIds, selectedSeasonId]);
  

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStandings();
    setRefreshing(false);
  }, [fetchStandings]);

  // Render tabs
  function renderTabs() {
    return (
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.key ? colors.primary : colors.textSecondary }
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.background}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <SeasonSelector
          seasons={seasons}
          selectedSeason={selectedSeasonId}
          onSelect={setSelectedSeasonId}
        />
        {renderTabs()}

        {loading ? (
          <Text style={{ color: colors.text, marginTop: 24 }}>Cargando...</Text>
        ) : error ? (
          <Text style={{ color: colors.error, marginTop: 24 }}>{error}</Text>
        ) : leagueIds.length === 0 ? (
          <Text style={{ color: colors.text, marginTop: 24 }}>No perteneces a ninguna liga en esta temporada.</Text>
        ) : activeTab === 'drivers' ? (
          <View style={styles.table}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, { width: 32 }]}>#</Text>
              <Text style={[styles.headerCell, { flex: 1 }]}>Piloto</Text>
              <Text style={[styles.headerCell, { width: 90 }]}>Equipo</Text>
              <Text style={[styles.headerCell, { width: 70, textAlign: 'right' }]}>Puntos</Text>
            </View>
            {driverStandings.map((row, idx) => {
              const isCurrentPilot = row.pilot.id === currentPilotId;
              return (
                <View key={row.pilot.id}>
                  <View style={[
                    styles.rowContent,
                    isCurrentPilot && {
                      backgroundColor: colors.primary + '22',
                      marginHorizontal: 0,
                    }
                  ]}>
                    <Text style={[
                      styles.position,
                      { color: PODIUM_COLORS[idx] || colors.primary }
                    ]}>
                      {idx + 1}
                    </Text>
                    <View style={styles.pilotCell}>
                      {row.pilot.avatar_url ? (
                        <Image
                          source={{ uri: row.pilot.avatar_url }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={[
                          styles.avatar,
                          { backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' }
                        ]}>
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                            {row.pilot.name?.[0]?.toUpperCase() || '?'}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                        {row.pilot.name}
                      </Text>
                    </View>
                    <View style={styles.teamCell}>
                      {row.team?.logo_url ? (
                        <Image
                          source={{ uri: row.team.logo_url }}
                          style={styles.teamAvatar}
                        />
                      ) : (
                        <View style={[styles.teamAvatar, { backgroundColor: '#ccc' }]} />
                      )}
                      <Text style={[styles.teamName, { color: colors.textSecondary }]} numberOfLines={1}>
                        {row.team?.name || '-'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.points,
                        { color: PODIUM_COLORS[idx] || colors.text }
                      ]}
                    >
                      {row.totalPoints}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, { width: 32 }]}>#</Text>
              <Text style={[styles.headerCell, { flex: 1 }]}>Equipo</Text>
              <Text style={[styles.headerCell, { width: 70, textAlign: 'right' }]}>Puntos</Text>
            </View>
            {teamStandings.map((row, idx) => {
              const isCurrentTeam = row.team.id === currentTeamId;
              return (
                <View key={row.team.id}>
                  <View style={[
                    styles.rowContent,
                    isCurrentTeam && {
                      backgroundColor: colors.primary + '22',
                      marginHorizontal: 0,
                    }
                  ]}>
                    <Text
                      style={[
                        styles.position,
                        { color: PODIUM_COLORS[idx] || colors.primary }
                      ]}
                    >
                      {idx + 1}
                    </Text>
                    <View style={styles.pilotCell}>
                      {row.team.logo_url ? (
                        <Image
                          source={{ uri: row.team.logo_url }}
                          style={styles.teamAvatar}
                        />
                      ) : (
                        <View style={[styles.teamAvatar, { backgroundColor: '#ccc' }]} />
                      )}
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                        {row.team.name}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.points,
                        { color: PODIUM_COLORS[idx] || colors.text }
                      ]}
                    >
                      {row.totalPoints}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 32, paddingTop: 0 },
  tabs: { flexDirection: 'row', marginBottom: 12, marginTop: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabText: { fontSize: 16, fontWeight: 'bold' },
  table: { marginTop: 0 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#bbb',
    paddingBottom: 5,
    marginBottom: 5,
  },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#888',
    paddingHorizontal: 8,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  position: { width: 32, fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
  pilotCell: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '500', maxWidth: 120 },
  teamCell: { flexDirection: 'row', alignItems: 'center', width: 90 },
  teamAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 5 },
  teamName: { fontSize: 14, maxWidth: 60 },
  points: { width: 70, textAlign: 'right', fontWeight: 'bold', fontSize: 16 },
});

