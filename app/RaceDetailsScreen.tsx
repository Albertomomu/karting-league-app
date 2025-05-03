import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useRoute } from '@react-navigation/native';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

type Session = {
  id: string;
  type: 'practice' | 'qualifying' | 'race1' | 'race2' | 'sprint';
  name: string;
};

type RaceResult = {
  id: string;
  position: number;
  pilot: {
    id: string;
    name: string;
    number: number;
    team: {
      name: string;
    };
  };
  points: number;
  time?: string;
  laps?: number;
};

export default function RaceDetailsScreen() {
  const { colors } = useTheme();
  const route = useRoute();
  const { raceId } = route.params;
  
  const [race, setRace] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [results, setResults] = useState<RaceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Definir las sesiones disponibles
  const availableSessions: Session[] = [
    { id: 'qualifying', type: 'qualifying', name: 'Clasificación' },
    { id: 'race1', type: 'race1', name: 'Carrera 1' },
    { id: 'race2', type: 'race2', name: 'Carrera 2' },
    { id: 'sprint', type: 'sprint', name: 'Sprint' },
    { id: 'practice', type: 'practice', name: 'Práctica' },
  ];

  useEffect(() => {
    async function fetchRaceDetails() {
      try {
        setLoading(true);
        
        // Obtener detalles de la carrera
        const { data: raceData, error: raceError } = await supabase
          .from('race')
          .select('*')
          .eq('id', raceId)
          .single();

        if (raceError) throw raceError;
        setRace(raceData);

        // Obtener las sesiones que tienen resultados
        const { data: resultsData, error: resultsError } = await supabase
          .from('race_result')
          .select('session_type')
          .eq('race_id', raceId)
          .not('session_type', 'is', null);

        if (resultsError) throw resultsError;

        // Filtrar solo las sesiones que tienen datos
        const sessionsWithResults = availableSessions.filter(session => 
          resultsData.some((r: any) => r.session_type === session.type)
        );

        setSessions(sessionsWithResults);
        
        // Seleccionar la primera sesión por defecto
        if (sessionsWithResults.length > 0) {
          setSelectedSession(sessionsWithResults[0].id);
        }
      } catch (error) {
        console.error('Error fetching race details:', error);
        setError('Error al cargar los detalles de la carrera');
      } finally {
        setLoading(false);
      }
    }

    fetchRaceDetails();
  }, [raceId]);

  useEffect(() => {
    async function fetchSessionResults() {
      if (!selectedSession || !raceId) return;

      try {
        setLoading(true);
        const sessionType = sessions.find(s => s.id === selectedSession)?.type;

        const { data, error } = await supabase
          .from('race_result')
          .select(`
            id,
            position,
            points,
            time,
            laps,
            pilot: pilot_id (
              id,
              name,
              number,
              team: team_id (name)
            )
          `)
          .eq('race_id', raceId)
          .eq('session_type', sessionType)
          .order('position', { ascending: true });

        if (error) throw error;

        setResults(data || []);
      } catch (error) {
        console.error('Error fetching session results:', error);
        setError('Error al cargar los resultados');
      } finally {
        setLoading(false);
      }
    }

    fetchSessionResults();
  }, [selectedSession, raceId]);

  const renderSessionSelector = () => {
    if (sessions.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sessionScrollContent}
      >
        {sessions.map((session) => (
          <TouchableOpacity
            key={session.id}
            style={[
              styles.sessionButton,
              selectedSession === session.id && { backgroundColor: colors.primaryLight }
            ]}
            onPress={() => setSelectedSession(session.id)}
          >
            <Text
              style={[
                styles.sessionButtonText,
                { color: selectedSession === session.id ? colors.primary : colors.textSecondary }
              ]}
            >
              {session.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderResults = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando resultados...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      );
    }

    if (results.length === 0) {
      return (
        <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
          No hay datos disponibles para esta sesión
        </Text>
      );
    }

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { color: colors.textSecondary, width: 50 }]}>Pos</Text>
          <Text style={[styles.headerText, { color: colors.textSecondary, flex: 2 }]}>Piloto</Text>
          <Text style={[styles.headerText, { color: colors.textSecondary, flex: 1 }]}>Equipo</Text>
          <Text style={[styles.headerText, { color: colors.textSecondary, width: 80, textAlign: 'right' }]}>
            {selectedSession === 'qualifying' ? 'Tiempo' : 'Puntos'}
          </Text>
        </View>

        {results.map((result) => (
          <Card key={result.id} style={styles.resultCard}>
            <View style={styles.resultRow}>
              <View style={[styles.positionCell, { width: 50 }]}>
                <View
                  style={[
                    styles.positionBadge,
                    result.position === 1 && { backgroundColor: '#FFD700' },
                    result.position === 2 && { backgroundColor: '#C0C0C0' },
                    result.position === 3 && { backgroundColor: '#CD7F32' },
                    result.position > 3 && { backgroundColor: colors.card }
                  ]}
                >
                  <Text
                    style={[
                      styles.positionText,
                      result.position <= 3 && { color: '#000' },
                      result.position > 3 && { color: colors.text }
                    ]}
                  >
                    {result.position}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.pilotCell, { flex: 2 }]}>
                <Text style={[styles.pilotName, { color: colors.text }]}>
                  {result.pilot.name}
                </Text>
                <Text style={[styles.pilotNumber, { color: colors.textSecondary }]}>
                  #{result.pilot.number}
                </Text>
              </View>

              <Text
                style={[styles.teamCell, { flex: 1, color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {result.pilot.team?.name || 'Sin equipo'}
              </Text>

              <View style={[styles.valueCell, { width: 80 }]}>
                <Text style={[styles.valueText, { color: colors.text }]}>
                  {selectedSession === 'qualifying' ? result.time || '--:--.---' : result.points || 0}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={race?.name || "Carrera"} showBackButton={true} />
      
      {renderSessionSelector()}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderResults()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sessionScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sessionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  sessionButtonText: {
    fontWeight: '500',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
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
  noDataText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
  resultsContainer: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  headerText: {
    fontWeight: '600',
    fontSize: 14,
  },
  resultCard: {
    marginBottom: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  positionCell: {
    alignItems: 'center',
  },
  positionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    fontWeight: '700',
    fontSize: 14,
  },
  pilotCell: {
    paddingRight: 8,
  },
  pilotName: {
    fontWeight: '500',
    fontSize: 14,
  },
  pilotNumber: {
    fontSize: 12,
  },
  teamCell: {
    fontSize: 14,
    paddingRight: 8,
  },
  valueCell: {
    alignItems: 'flex-end',
  },
  valueText: {
    fontWeight: '500',
    fontSize: 14,
  },
});