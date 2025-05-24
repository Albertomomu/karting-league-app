import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase, Race, RaceResult, Pilot } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocalSearchParams } from 'expo-router';

type Circuit = {
  id: string;
  name: string;
  location?: string;
};

type Session = {
  id: string;
  name: string;
  race_id: string;
};

type RaceWithCircuit = Race & {
  circuit?: Circuit;
};

type RaceResultWithSession = RaceResult & {
  pilot: Pilot;
  session: Session;
  team?: { id: string; name: string; logo_url?: string } | null;
};

const PODIUM_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function RaceDetailsScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [results, setResults] = useState<RaceResultWithSession[]>([]);
  const [race, setRace] = useState<RaceWithCircuit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- MODIFICACIÓN: Estado para la sesión seleccionada
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // --- MODIFICACIÓN: Para resaltar piloto y equipo logueado
  const [currentPilotId, setCurrentPilotId] = useState<string | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRaceAndResults() {
      setLoading(true);
      setError(null);
      try {
        // 1) Traer carrera con league_id
        const { data: raceData, error: raceError } = await supabase
          .from('race')
          .select('*, circuit (*), league_id')
          .eq('id', id)
          .single();
        if (raceError) throw raceError;
        setRace(raceData);
    
        // 2) Traer resultados básicos
        const { data: resultsData, error: resultsError } = await supabase
          .from('race_result')
          .select(`
            *,
            pilot (*),
            session (*)
          `)
          .eq('race_id', id)
          .order('session_id', { ascending: true })
          .order('race_position', { ascending: true });
        if (resultsError) throw resultsError;
    
        // 3) Traer piloto→equipo usando league_id de la carrera
        const { data: pilotTeams, error: ptError } = await supabase
          .from('pilot_team_season')
          .select('pilot_id, team:team_id(id, name, logo_url)')
          .eq('league_id', raceData.league_id);   // <— aquí cambio a league_id
        if (ptError) throw ptError;
    
        // 4) Adjuntar team a cada resultado
        const resultsWithTeam = (resultsData || []).map(res => ({
          ...res,
          team: pilotTeams.find(pt => pt.pilot_id === res.pilot.id)?.team || null,
        }));
    
        setResults(resultsWithTeam);
      } catch (err: any) {
        console.error(err);
        setError('Error al cargar los resultados.');
      } finally {
        setLoading(false);
      }
    }    

    if (id) fetchRaceAndResults();
  }, [id]);

  // --- MODIFICACIÓN: Obtener sesiones únicas
  const sessions = Array.from(
    new Map(results.map(r => [r.session?.id, r.session])).values()
  ).filter(Boolean).reverse() as Session[];

  // --- MODIFICACIÓN: Seleccionar la primera sesión por defecto
  useEffect(() => {
    if (sessions.length > 0) {
      setSelectedSessionId((prev) =>
        sessions.some((s) => s.id === prev) ? prev : sessions[0].id
      );
    }
  }, [results]);

  // --- MODIFICACIÓN: Obtener piloto y equipo logueado
  useEffect(() => {
    async function fetchCurrentPilotAndTeam() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !race) return;
      const { data: pilot } = await supabase
        .from('pilot')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (pilot) {
        setCurrentPilotId(pilot.id);
        const { data: pts } = await supabase
          .from('pilot_team_season')
          .select('team_id')
          .eq('pilot_id', pilot.id)
          .eq('season_id', race.season_id)
          .single();
        if (pts?.team_id) setCurrentTeamId(pts.team_id);
      }
    }
    if (race) fetchCurrentPilotAndTeam();
  }, [race]);

  const formatRaceDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM, yyyy", { locale: es });
  };

  // --- MODIFICACIÓN: Render tabla igual que standings
  function renderResultsTable(filteredResults: RaceResultWithSession[]) {
    if (!filteredResults.length) {
      return (
        <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
          No hay resultados disponibles para esta sesión.
        </Text>
      );
    }

    return (
      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerCell, { width: 32 }]}>#</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>Piloto</Text>
          <Text style={[styles.headerCell, { width: 90 }]}>Equipo</Text>
          <Text style={[styles.headerCell, { width: 70, textAlign: 'right' }]}>Puntos</Text>
        </View>
        {filteredResults.map((result, idx) => {
          const isCurrentPilot = result.pilot?.id === currentPilotId;
          const isCurrentTeam = result.team?.id === currentTeamId;
          return (
            <View
              key={result.id}
              style={[
                styles.row,
                isCurrentPilot && { backgroundColor: colors.primary + '22' }
              ]}
            >
              <Text style={[
                styles.position,
                { color: PODIUM_COLORS[idx] || colors.primary }
              ]}>
                {result.race_position}
              </Text>
              <View style={styles.pilotCell}>
                {/* Si tienes avatar, puedes mostrarlo aquí */}
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {result.pilot?.name}
                </Text>
              </View>
              <View style={styles.teamCell}>
                {result.team?.logo_url ? (
                  <Image source={{ uri: result.team.logo_url }} style={styles.teamAvatar} />
                ) : (
                  <View style={[styles.teamAvatar, { backgroundColor: '#ccc' }]} />
                )}
                <Text
                  style={[
                    styles.teamName,
                    isCurrentTeam && { color: colors.primary, fontWeight: 'bold' },
                    !isCurrentTeam && { color: colors.textSecondary }
                  ]}
                  numberOfLines={1}
                >
                  {result.team?.name || '-'}
                </Text>
              </View>
              <Text
                style={[
                  styles.points,
                  { color: PODIUM_COLORS[idx] || colors.text }
                ]}
              >
                {result.points ?? 0}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={race ? race.name : "Detalles de la carrera"} showBackButton />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando resultados...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {race && (
            <Card style={styles.raceInfoCard}>
              <Text style={[styles.raceName, { color: colors.text }]}>{race.name}</Text>
              <View style={styles.raceDetails}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="map-marker" size={18} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {race.circuit?.name || 'Sin circuito'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="calendar" size={18} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {formatRaceDate(race.date)}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Selector horizontal de sesiones */}
          {sessions.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.sessionSelector}
              contentContainerStyle={{ paddingVertical: 10 }}
            >
              {sessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={[
                    styles.sessionButton,
                    selectedSessionId === session.id && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedSessionId(session.id)}
                >
                  <Text
                    style={[
                      styles.sessionButtonText,
                      selectedSessionId === session.id && { color: '#fff' },
                    ]}
                  >
                    {session.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Tabla de resultados de la sesión seleccionada */}
          {selectedSessionId &&
            renderResultsTable(
              results.filter(result => result.session?.id === selectedSessionId)
            )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
  },
  raceInfoCard: {
    marginBottom: 18,
    padding: 18,
  },
  raceName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  raceDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
  },
  noDataText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
  sessionSelector: {
    flexDirection: 'row',
    marginVertical: 8,
    marginBottom: 18,
  },
  sessionButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  sessionButtonText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
