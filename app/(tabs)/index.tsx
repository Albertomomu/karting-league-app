import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Flag, Clock, ChevronRight } from 'lucide-react-native';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { useEffect, useState } from 'react';
import { supabase, Race, RaceResult } from '@/lib/supabase';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [nextRace, setNextRace] = useState<Race | null>(null);
  const [recentResults, setRecentResults] = useState<RaceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Fetch next race
        const { data: raceData, error: raceError } = await supabase
          .from('races')
          .select('*')
          .gt('date', new Date().toISOString())
          .order('date', { ascending: true })
          .limit(1)
          .single();

        if (raceError && raceError.code !== 'PGRST116') {
          console.error('Error fetching next race:', raceError);
        } else {
          setNextRace(raceData);
        }

        // Fetch recent results
        const { data: resultsData, error: resultsError } = await supabase
          .from('race_results')
          .select(`
            id,
            race_id,
            races (
              name,
              circuit_id,
              date,
              circuits (name, image_url)
            ),
            session_type,
            position,
            pilot_id,
            pilots (name, number)
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        if (resultsError) {
          console.error('Error fetching recent results:', resultsError);
          setError('Error al cargar los resultados recientes');
        } else {
          setRecentResults(resultsData || []);
        }
      } catch (error) {
        console.error('Error in data fetching:', error);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Karting League" showBackButton={false} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {user && (
          <View style={styles.welcomeSection}>
            <Text style={[styles.welcomeText, { color: colors.text }]}>
              ¡Bienvenido, {user.user_metadata?.name || 'Piloto'}!
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Mantente al día con la información más reciente
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Cargando datos...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : (
          <>
            {nextRace && (
              <Card style={styles.nextRaceCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Próxima Carrera</Text>
                  <Calendar size={20} color={colors.primary} />
                </View>
                
                <View style={styles.nextRaceContent}>
                  <Image 
                    source={{ uri: nextRace.circuit_image || 'https://images.unsplash.com/photo-1630925546089-7ac0e8028e9f?q=80&w=2070&auto=format&fit=crop' }} 
                    style={styles.circuitImage} 
                  />
                  <View style={styles.raceInfo}>
                    <Text style={[styles.raceName, { color: colors.text }]}>{nextRace.name}</Text>
                    <Text style={[styles.raceCircuit, { color: colors.textSecondary }]}>
                      {nextRace.circuit_name}
                    </Text>
                    <Text style={[styles.raceDate, { color: colors.primary }]}>
                      {new Date(nextRace.date).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            <View style={styles.statsSection}>
              <Card style={styles.statCard}>
                <View style={styles.statContent}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                    <Flag size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>12</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Carreras</Text>
                </View>
              </Card>
              
              <Card style={styles.statCard}>
                <View style={styles.statContent}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                    <Clock size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>1:22.456</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mejor Vuelta</Text>
                </View>
              </Card>
            </View>

            <View style={styles.recentResultsSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Resultados Recientes</Text>
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={[styles.viewAllText, { color: colors.primary }]}>Ver Todos</Text>
                  <ChevronRight size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {recentResults.length > 0 ? (
                recentResults.map((result, index) => (
                  <Card key={result.id || index} style={styles.resultCard}>
                    <View style={styles.resultHeader}>
                      <Text style={[styles.resultCircuit, { color: colors.textSecondary }]}>
                        {result.races?.circuits?.name || 'Circuito Desconocido'}
                      </Text>
                      <Text style={[styles.resultSession, { color: colors.primary }]}>
                        {result.session_type === 'practice' ? 'Práctica' : 
                         result.session_type === 'qualifying' ? 'Clasificación' :
                         result.session_type === 'race1' ? 'Carrera 1' :
                         result.session_type === 'race2' ? 'Carrera 2' : 
                         result.session_type}
                      </Text>
                    </View>
                    <View style={styles.resultContent}>
                      <View style={styles.pilotInfo}>
                        <View style={[styles.pilotNumber, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.pilotNumberText, { color: colors.white }]}>
                            {result.pilots?.number || '00'}
                          </Text>
                        </View>
                        <Text style={[styles.pilotName, { color: colors.text }]}>
                          {result.pilots?.name || 'Piloto Desconocido'}
                        </Text>
                      </View>
                      <View style={styles.positionContainer}>
                        <Text style={[styles.position, { color: colors.text }]}>
                          {result.position || '-'}
                        </Text>
                        <Text style={[styles.positionLabel, { color: colors.textSecondary }]}>POS</Text>
                      </View>
                    </View>
                  </Card>
                ))
              ) : (
                <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>No hay resultados recientes disponibles</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
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
  },
  welcomeSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: 'red',
  },
  nextRaceCard: {
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  nextRaceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circuitImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  raceInfo: {
    flex: 1,
  },
  raceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  raceCircuit: {
    fontSize: 14,
    marginBottom: 4,
  },
  raceDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  statContent: {
    alignItems: 'center',
    padding: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  recentResultsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  resultCard: {
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultCircuit: {
    fontSize: 14,
  },
  resultSession: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pilotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pilotNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pilotNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  pilotName: {
    fontSize: 16,
    fontWeight: '500',
  },
  positionContainer: {
    alignItems: 'center',
  },
  position: {
    fontSize: 20,
    fontWeight: '700',
  },
  positionLabel: {
    fontSize: 12,
  },
  noResultsText: {
    textAlign: 'center',
    padding: 16,
  },
});