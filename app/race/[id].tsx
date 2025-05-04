import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase, Race, RaceResult, Pilot } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocalSearchParams } from 'expo-router';

// Tipos
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
};

export default function RaceDetailsScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams();
  const [results, setResults] = useState<RaceResultWithSession[]>([]);
  const [race, setRace] = useState<RaceWithCircuit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- MODIFICACIÓN: Estado para la sesión seleccionada
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRaceAndResults() {
      setLoading(true);
      setError(null);
      try {
        // Traer los datos de la carrera junto al circuito
        const { data: raceData, error: raceError } = await supabase
          .from('race')
          .select('*, circuit (*)')
          .eq('id', id)
          .single();
        if (raceError) throw raceError;
        setRace(raceData);

        // Traer los resultados con join a piloto y sesión
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
        setResults(resultsData || []);
      } catch (err: any) {
        setError('Error al cargar los resultados.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchRaceAndResults();
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

  const formatRaceDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM, yyyy", { locale: es });
  };

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

          {/* --- MODIFICACIÓN: Selector horizontal de sesiones --- */}
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

          {/* --- MODIFICACIÓN: Mostrar solo la sesión seleccionada --- */}
          {selectedSessionId ? (
            <View style={styles.sessionSection}>
              <Text style={[styles.sessionTitle, { color: colors.primary }]}>
                {sessions.find(s => s.id === selectedSessionId)?.name}
              </Text>
              <View style={styles.sessionResults}>
                {results
                  .filter(result => result.session?.id === selectedSessionId)
                  .map(result => (
                    <Card key={result.id} style={styles.resultCard}>
                      <View style={styles.resultRow}>
                        <Text style={[styles.position, { color: colors.primary }]}>
                          {result.race_position}
                        </Text>
                        <View style={styles.pilotInfo}>
                          <Text style={[styles.pilotName, { color: colors.text }]}>
                            {result.pilot?.name}
                          </Text>
                          {result.pilot?.team && (
                            <Text style={[styles.teamName, { color: colors.textSecondary }]}>
                              {result.pilot.team}
                            </Text>
                          )}
                        </View>
                        <View style={styles.pointsBox}>
                          <MaterialCommunityIcons name="star" size={16} color={colors.warning} />
                          <Text style={[styles.points, { color: colors.text }]}>
                            {result.points ?? 0}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.resultDetailsRow}>
                        {result.best_lap && (
                          <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="timer" size={16} color={colors.info} />
                            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                              Mejor vuelta: {result.best_lap}
                            </Text>
                          </View>
                        )}
                        {result.status && (
                          <View style={styles.detailItem}>
                            <MaterialCommunityIcons name="flag-checkered" size={16} color={colors.success} />
                            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                              {result.status}
                            </Text>
                          </View>
                        )}
                      </View>
                    </Card>
                  ))}
              </View>
            </View>
          ) : (
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
              No hay resultados disponibles para esta sesión.
            </Text>
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
  sessionSection: {
    marginBottom: 28,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 8,
  },
  sessionResults: {},
  resultCard: {
    marginBottom: 10,
    padding: 14,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  position: {
    fontSize: 22,
    fontWeight: 'bold',
    width: 36,
    textAlign: 'center',
  },
  pilotInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pilotName: {
    fontSize: 16,
    fontWeight: '600',
  },
  teamName: {
    fontSize: 13,
    marginTop: 2,
  },
  pointsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  points: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  resultDetailsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
});
