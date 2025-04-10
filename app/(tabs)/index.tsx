import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Flag, Clock, ChevronRight, TrendingUp, Award, Target, Trophy } from 'lucide-react-native';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase, Race, RaceResult, LapTime, Pilot } from '@/lib/supabase';

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [pilot, setPilot] = useState<Pilot | null>(null);
  const [nextRace, setNextRace] = useState<Race | null>(null);
  const [recentResults, setRecentResults] = useState<RaceResult[]>([]);
  const [pilotStats, setPilotStats] = useState<any>(null);
  const [lapTimeData, setLapTimeData] = useState<any>(null);
  const [positionData, setPositionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        setLoading(true);
        console.log('Starting data fetch for user:', user.id);
        
        // Get pilot ID for current user
        console.log('Fetching pilot data...');
        const { data: pilotData, error: pilotError } = await supabase
          .from('pilot')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (pilotError) throw pilotError;
        console.log('Pilot data:', pilotData);
        setPilot(pilotData);
        const pilotId = pilotData.id;
        console.log('Pilot ID found:', pilotId);

        // Fetch next upcoming race
        console.log('Fetching next race...');
        const { data: raceData, error: raceError } = await supabase
          .from('race')
          .select('*, circuit(*)')
          .gt('date', new Date().toISOString())
          .order('date', { ascending: true })
          .limit(1)
          .single();

        if (raceError && raceError.code !== 'PGRST116') {
          console.error('Error fetching next race:', raceError);
        } else {
          setNextRace(raceData);
          console.log('Next race data:', raceData);
        }

        // Fetch recent race results for the pilot
        console.log('Fetching recent results...');
        const { data: resultsData, error: resultsError } = await supabase
          .from('race_result')
          .select(`
            id,
            race_id,
            race (
              name,
              circuit_id,
              date,
              circuit (name, image_url)
            ),
            session_id,
            race_position,
            points,
            best_lap
          `)
          .eq('pilot_id', pilotId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (resultsError) throw resultsError;
        setRecentResults(resultsData || []);
        console.log('Recent results:', resultsData);

        // Calculate pilot statistics
        console.log('Calculating pilot stats...');
        const { data: statsData, error: statsError } = await supabase
          .from('race_result')
          .select(`
            race_position,
            points,
            best_lap,
            session_id
          `)
          .eq('pilot_id', pilotId);

        if (statsError) throw statsError;
        console.log('Raw stats data:', statsData);

        const stats = {
          totalRaces: statsData.filter(r => r.session_id.startsWith('race')).length,
          podiums: statsData.filter(r => r.session_id.startsWith('race') && r.race_position <= 3).length,
          wins: statsData.filter(r => r.session_id.startsWith('race') && r.race_position === 1).length,
          totalPoints: statsData.reduce((sum, r) => sum + (r.points || 0), 0),
          bestPosition: Math.min(...statsData.filter(r => r.session_id.startsWith('race')).map(r => r.race_position || 999)),
          bestLap: statsData.reduce((best, r) => {
            if (!r.best_lap) return best;
            return !best || r.best_lap < best ? r.best_lap : best;
          }, null),
        };
        setPilotStats(stats);
        console.log('Calculated stats:', stats);

        // Fetch lap time progression data
        console.log('Fetching lap time data...');
        const { data: lapTimesData, error: lapTimesError } = await supabase
          .from('lap_time')
          .select(`
            time,
            race_id,
            race (date)
          `)
          .eq('pilot_id', pilotId)
          .order('date', { foreignTable: 'race', ascending: true });

        if (lapTimesError) throw lapTimesError;
        console.log('Raw lap time data:', lapTimesData);

        const processedLapTimes = lapTimesData.map(lt => ({
          time: lt.time,
          date: lt.race.date
        }));

        setLapTimeData({
          labels: processedLapTimes.map(lt => format(new Date(lt.date), 'MMM d', { locale: es })),
          datasets: [{
            data: processedLapTimes.map(lt => {
              const [mins, secs] = lt.time.split(':');
              return parseFloat(mins) * 60 + parseFloat(secs);
            })
          }]
        });
        console.log('Processed lap time data:', lapTimeData);

        // Fetch position progression data
        console.log('Fetching position data...');
        const { data: positionsData, error: positionsError } = await supabase
          .from('race_result')
          .select(`
            race_position,
            race (date)
          `)
          .eq('pilot_id', pilotId)
          .order('date', { foreignTable: 'race', ascending: true });

        if (positionsError) throw positionsError;
        console.log('Raw position data:', positionsData);

        setPositionData({
          labels: positionsData.map(p => format(new Date(p.race.date), 'MMM d', { locale: es })),
          datasets: [{
            data: positionsData.map(p => p.race_position || 0)
          }]
        });
        console.log('Processed position data:', positionData);

      } catch (error) {
        console.error('Error in data fetching:', error);
        setError('Error loading data');
      } finally {
        setLoading(false);
        console.log('Data loading complete');
      }
    }

    fetchData();
  }, [user]);

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(${parseInt(colors.primary.slice(1, 3), 16)}, ${parseInt(colors.primary.slice(3, 5), 16)}, ${parseInt(colors.primary.slice(5, 7), 16)}, ${opacity})`,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: colors.primary
    },
    propsForLabels: {
      fontSize: 10,
    },
    propsForVerticalLabels: {
      fontSize: 10,
      rotation: 0,
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Karting League" showBackButton={false} />
      
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {user && (
          <View style={styles.welcomeSection}>
            <Text style={[styles.welcomeText, { color: colors.text }]}>
              Bienvenido, {pilot?.name || 'Pilot'}!
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
              Cargando...
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
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Próxima carrera</Text>
                  <Calendar size={20} color={colors.primary} />
                </View>
                
                <View style={styles.nextRaceContent}>
                  <Image 
                    source={{ uri: nextRace?.circuit?.image_url || 'https://images.unsplash.com/photo-1630925546089-7ac0e8028e9f?q=80&w=2070&auto=format&fit=crop' }} 
                    style={styles.circuitImage} 
                  />
                  <View style={styles.raceInfo}>
                    <Text style={[styles.raceName, { color: colors.text }]}>{nextRace.name}</Text>
                    <Text style={[styles.raceCircuit, { color: colors.textSecondary }]}>
                      Circuito: {nextRace?.circuit?.name}
                    </Text>
                    <Text style={[styles.raceDate, { color: colors.primary }]}>
                      Fecha: {format(new Date(nextRace.date), "EEEE d 'de' MMMM", { locale: es })
                        .replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {pilotStats && (
              <Card style={styles.statsCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Estadísticas generales</Text>
                  <Award size={20} color={colors.primary} />
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <Flag size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.totalRaces}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Carreras</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <Award size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.podiums}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Podiums</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <Trophy size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.wins}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Victorias</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <Target size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.bestPosition}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mejor posición</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <Clock size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.bestLap || '-'}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mejor tiempo</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <TrendingUp size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.totalPoints}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Puntos</Text>
                  </View>
                </View>
              </Card>
            )}

            {lapTimeData && (
              <Card style={styles.chartCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Progresión de tiempo por vuelta</Text>
                  <Clock size={20} color={colors.primary} />
                </View>
                
                <LineChart
                  data={lapTimeData}
                  width={screenWidth - 64}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  yAxisSuffix="s"
                  yAxisLabel=""
                  formatYLabel={(value: string) => {
                    const time = parseFloat(value);
                    const minutes = Math.floor(time / 60);
                    const seconds = (time % 60).toFixed(3);
                    return `${minutes}:${seconds.padStart(6, '0')}`;
                  }}
                />
              </Card>
            )}

            {positionData && (
              <Card style={styles.chartCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Race Positions</Text>
                  <Target size={20} color={colors.primary} />
                </View>
                
                <BarChart
                  data={positionData}
                  width={screenWidth - 64}
                  height={220}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  showValuesOnTopOfBars
                  fromZero
                  segments={4}
                  yAxisLabel=""
                  yAxisSuffix=""
                />
              </Card>
            )}

            <View style={styles.recentResultsSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Results</Text>
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
                  <ChevronRight size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {recentResults.length > 0 ? (
                recentResults.map((result) => (
                  <Card key={result.id} style={styles.resultCard}>
                    <View style={styles.resultHeader}>
                      <Text style={[styles.resultCircuit, { color: colors.textSecondary }]}>
                        {result.race?.circuit?.name || 'Unknown Circuit'}
                      </Text>
                      <Text style={[styles.resultSession, { color: colors.primary }]}>
                        {result.session_id === 'practice' ? 'Practice' : 
                         result.session_id === 'qualifying' ? 'Qualifying' :
                         result.session_id === 'race1' ? 'Race 1' :
                         result.session_id === 'race2' ? 'Race 2' : 
                         result.session_id}
                      </Text>
                    </View>
                    <View style={styles.resultContent}>
                      <View style={styles.resultStats}>
                        <View style={styles.resultStat}>
                          <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>Position</Text>
                          <Text style={[styles.resultStatValue, { color: colors.text }]}>
                            {result.race_position || '-'}
                          </Text>
                        </View>
                        <View style={styles.resultStat}>
                          <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>Points</Text>
                          <Text style={[styles.resultStatValue, { color: colors.text }]}>
                            {result.points || '0'}
                          </Text>
                        </View>
                        <View style={styles.resultStat}>
                          <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>Best Lap</Text>
                          <Text style={[styles.resultStatValue, { color: colors.text }]}>
                            {result.best_lap || '-'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                ))
              ) : (
                <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                  No recent results available
                </Text>
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
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
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
  statsCard: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 12,
  },
  chartCard: {
    marginBottom: 24,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    alignSelf: 'center',
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
    marginBottom: 12,
  },
  resultCircuit: {
    fontSize: 14,
  },
  resultSession: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultContent: {
    marginTop: 8,
  },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultStat: {
    alignItems: 'center',
  },
  resultStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  resultStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  noResultsText: {
    textAlign: 'center',
    padding: 16,
  },
});