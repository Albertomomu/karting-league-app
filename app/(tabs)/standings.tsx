import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import SeasonSelector from '@/components/SeasonSelector';
import Toast from 'react-native-toast-message';

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

  // 1. Cargar temporadas
  useEffect(() => {
    async function fetchSeasons() {
      setLoading(true);
      setError(null);
      try {
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

  // 2. Cargar leagues de la temporada seleccionada
  useEffect(() => {
    async function fetchLeagues() {
      if (!selectedSeasonId) return;
      try {
        const { data, error } = await supabase
          .from('league')
          .select('id')
          .eq('season_id', selectedSeasonId);
        if (error) throw error;
        setLeagueIds(data.map(l => l.id));
      } catch (err) {
        setError('Error cargando ligas');
      }
    }
    fetchLeagues();
  }, [selectedSeasonId]);

  // Limpiar standings al cambiar temporada
  useEffect(() => {
    setDriverStandings([]);
    setTeamStandings([]);
  }, [selectedSeasonId]);

  // 3. Standings de pilotos y equipos
  const fetchStandings = useCallback(async () => {
    if (!leagueIds.length) return;
    setLoading(true);
    setError(null);
    try {
      // Resultados de carrera
      const { data: results, error } = await supabase
        .from('race_result')
        .select('pilot_id, points, pilot:pilot(id, name, avatar_url), race:race(id, league_id)')
        .in('race.league_id', leagueIds);

      if (error) throw error;

      if (!results || results.length === 0) {
        setDriverStandings([]);
        setTeamStandings([]);
        setLoading(false);
        return;
      }
      //console.log("Resultados", results);

      // Relación piloto-equipo-temporada
      const { data: pilotTeams, error: ptsError } = await supabase
        .from('pilot_team_season')
        .select('pilot_id, team:team_id(id, name, logo_url)')
        .eq('season_id', selectedSeasonId)
        .in('league_id', leagueIds);

      if (ptsError) throw ptsError;
      const pilotTeamMap = {};
      pilotTeams.forEach(row => {
        pilotTeamMap[row.pilot_id] = row.team;
      });

      // PILOTOS
      const standingsMap = {};
      results.forEach(r => {
        if (!standingsMap[r.pilot_id]) {
          standingsMap[r.pilot_id] = {
            pilot: r.pilot,
            totalPoints: 0,
            team: pilotTeamMap[r.pilot_id] || null,
          };
        }
        standingsMap[r.pilot_id].totalPoints += r.points || 0;
      });
      const standingsArr = Object.values(standingsMap).sort((a, b) => b.totalPoints - a.totalPoints);

      setDriverStandings(standingsArr);

      // EQUIPOS
      const teamMap = {};
      results.forEach(r => {
        const team = pilotTeamMap[r.pilot_id];
        if (!team) return; // Ignora pilotos sin equipo en esta temporada
        if (!teamMap[team.id]) {
          teamMap[team.id] = {
            team,
            totalPoints: 0,
          };
        }
        teamMap[team.id].totalPoints += r.points || 0;
      });
      const teamsArr = Object.values(teamMap).sort((a, b) => b.totalPoints - a.totalPoints);

      setTeamStandings(teamsArr);

      Toast.show({
        type: 'success',
        text1: 'Clasificación actualizada',
        text2: 'Se han actualizado las clasificaciones de pilotos y equipos',
        position: 'top',
      });
    } catch (err) {
      setError('Error cargando clasificación');
      console.log(err);
      Toast.show({
        type: 'error',
        text1: 'Error al cargar clasificación',
        text2: 'Intentalo de nuevo',
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  }, [leagueIds, selectedSeasonId]);

  // Cuando cambian las ligas, carga standings
  useEffect(() => {
    if (leagueIds.length > 0) {
      fetchStandings();
    }
  }, [leagueIds]);

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
        ) : activeTab === 'drivers' ? (
          <View style={styles.table}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, { width: 32 }]}>#</Text>
              <Text style={[styles.headerCell, { flex: 1 }]}>Piloto</Text>
              <Text style={[styles.headerCell, { width: 90 }]}>Equipo</Text>
              <Text style={[styles.headerCell, { width: 70, textAlign: 'right' }]}>Puntos</Text>
            </View>
            {driverStandings.map((row, idx) => (
              <View key={row.pilot.id} style={styles.row}>
                <Text
                  style={[
                    styles.position,
                    { color: PODIUM_COLORS[idx] || colors.primary }
                  ]}
                >
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
            ))}
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, { width: 32 }]}>#</Text>
              <Text style={[styles.headerCell, { flex: 1 }]}>Equipo</Text>
              <Text style={[styles.headerCell, { width: 70, textAlign: 'right' }]}>Puntos</Text>
            </View>
            {teamStandings.map((row, idx) => (
              <View key={row.team.id} style={styles.row}>
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
            ))}
          </View>
        )}
      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 0 },
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  position: { width: 32, fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
  pilotCell: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8, backgroundColor: '#eee' },
  teamCell: { width: 90, flexDirection: 'row', alignItems: 'center' },
  teamAvatar: { width: 22, height: 22, borderRadius: 11, marginRight: 6, backgroundColor: '#eee' },
  teamName: { fontSize: 13, flexShrink: 1 },
  name: { fontSize: 15, flexShrink: 1 },
  points: { width: 70, textAlign: 'right', fontWeight: 'bold', fontSize: 15 },
});
