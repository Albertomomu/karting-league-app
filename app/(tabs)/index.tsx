import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase, Race, RaceResult, LapTime, Pilot, Session } from '@/lib/supabase';
import { useRouter } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

type RaceResultWithRelations = RaceResult & {
  race: Race;
  pilot: Pilot;
  session: Session;
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [pilot, setPilot] = useState<Pilot | null>(null);
  const [nextRace, setNextRace] = useState<Race | null>(null);
  const [recentResults, setRecentResults] = useState<RaceResult[]>([]);
  const [pilotStats, setPilotStats] = useState<any>(null);
  const [lapTimeData, setLapTimeData] = useState<any>(null);
  const [positionData, setPositionData] = useState<any>(null);
  const [championshipPositionData, setChampionshipPositionData] = useState<any>(null);
  const [results, setResults] = useState<RaceResultWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        setLoading(true);

        // Get pilot data for current user
        const { data: pilotData, error: pilotError } = await supabase
          .from('pilot')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (pilotError) throw pilotError;
        setPilot(pilotData);
        const pilotId = pilotData.id;

        // Fetch next upcoming race
        const { data: raceData, error: raceError } = await supabase
          .from('race')
          .select('*, circuit (*)')
          .gt('date', new Date().toISOString())
          .order('date', { ascending: true })
          .limit(1)
          .single();

        if (raceError && raceError.code !== 'PGRST116') {
          console.error('Error fetching next race:', raceError);
        } else {
          setNextRace(raceData);
        }

        // Fetch recent race results for the pilot
        const { data: resultsData, error: resultsError } = await supabase
          .from('race_result')
          .select(`
            *,
            race (
              *,
              circuit (*)
            ),
            session (name)
          `)
          .eq('pilot_id', pilotId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (resultsError) throw resultsError;
        setRecentResults(resultsData || []);

        // Calculate pilot statistics
        const { data: statsData, error: statsError } = await supabase
          .from('race_result')
          .select(`
            race_position,
            points,
            best_lap,
            session_id,
            session (name)
          `)
          .eq('pilot_id', pilotId);

        if (statsError) throw statsError;

        const processedStats = statsData.map(r => ({
          race_position: r.race_position,
          points: r.points,
          best_lap: r.best_lap,
          session_name: r.session ? r.session.name : null
        }));

        const stats = {
          totalRaces: processedStats.filter(r => r.session_name?.startsWith('Carrera')).length,
          podiums: processedStats.filter(r => r.session_name?.startsWith('Carrera') && r.race_position <= 3).length,
          wins: processedStats.filter(r => r.session_name?.startsWith('Carrera') && r.race_position === 1).length,
          totalPoints: processedStats.reduce((sum, r) => sum + (r.points || 0), 0),
          bestPosition: Math.min(...processedStats.filter(r => r.session_name?.startsWith('Carrera')).map(r => r.race_position || 999)),
          polePosition: processedStats.filter(r => r.session_name?.startsWith('Clasificación') && r.race_position === 1).length
        };
        setPilotStats(stats);

        // Fetching lap times
        const { data: lapTimesData, error: lapTimesError } = await supabase
          .from('lap_time')
          .select(`
            time,
            race (
              date
            )
          `)
          .eq('pilot_id', pilotId);

        type SimpleLapTime = {
          time: string;
          race: { date: string } | null;
        };

        const lapTimes = lapTimesData as unknown as SimpleLapTime[];

        const processedLapTimes = lapTimes
          .filter(lt => lt.race !== null && lt.time)
          .map(lt => ({
            time: lt.time,
            date: lt.race!.date
          }));

        setLapTimeData({
          labels: processedLapTimes.map(lt => format(new Date(lt.date), 'MMM d', { locale: es })),
          datasets: [{
            data: processedLapTimes.map(lt => {
              if (!lt.time) return 0;
              const [mins, secs] = lt.time.split(':');
              return parseFloat(mins) * 60 + parseFloat(secs);
            })
          }]
        });

        // Fetch position progression data
        const { data: positionsData, error: positionsError } = await supabase
          .from('race_result')
          .select(`
          race_position,
          race (
            date
          )
        `)
          .eq('pilot_id', pilotId)
          .in('session_id', [
            '483d8139-1a8a-4ede-a738-d75fb0cb8849', // Carrera I
            '149d57f5-b84f-4518-b174-d8674c581def'  // Carrera II
          ])
          .order('date', { foreignTable: 'race', ascending: true });

        if (positionsError) throw positionsError;

        type SimpleRaceResult = {
          race_position: number | null;
          race: { date: string } | null;
        };

        const positions = positionsData as unknown as SimpleRaceResult[];

        const validPositions = positions
          .filter(p => p.race !== null && p.race_position !== null)
          .map(p => ({
            position: p.race_position!,
            date: p.race!.date
          }));

        setPositionData({
          labels: validPositions.map(p => format(new Date(p.date), 'MMM d', { locale: es })),
          datasets: [{
            data: validPositions.map(p => p.position)
          }]
        });

        // NEW: Fetch championship position progression
        const { data: allResultsData, error: allResultsError } = await supabase
          .from('race_result')
          .select(`
            pilot_id,
            points,
            race (
              id,
              date,
              name
            )
          `)
          .order('date', { foreignTable: 'race', ascending: true });

        if (allResultsError) throw allResultsError;

        type ProcessedResult = {
          pilot_id: string;
          points: number;
          race_id: string;
          date: string;
        };

        const processedResults = (allResultsData as any[]).filter(r => r.race !== null).map(r => ({
          pilot_id: r.pilot_id,
          points: r.points || 0,
          race_id: r.race.id,
          date: r.race.date
        }));

        // Agrupamos por carrera (ordenadas por fecha)
        const races = Array.from(new Set(processedResults.map(r => r.race_id)))
          .map(raceId => {
            const raceData = processedResults.find(r => r.race_id === raceId);
            return {
              id: raceId,
              date: raceData?.date || '',
              name: raceData?.race?.name || ''
            };
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculamos puntos acumulados por piloto después de cada carrera
        const championshipData: {
          raceId: string;
          date: string;
          raceName: string;
          standings: {
            pilot_id: string;
            totalPoints: number;
          }[];
        }[] = [];

        let accumulatedPoints: Record<string, number> = {};

        for (const race of races) {
          // Obtenemos resultados de esta carrera
          const raceResults = processedResults.filter(r => r.race_id === race.id);

          // Sumamos puntos a los acumulados
          for (const result of raceResults) {
            accumulatedPoints[result.pilot_id] =
              (accumulatedPoints[result.pilot_id] || 0) + result.points;
          }

          // Guardamos el estado del campeonato después de esta carrera
          championshipData.push({
            raceId: race.id,
            date: race.date,
            raceName: race.name,
            standings: Object.entries(accumulatedPoints)
              .map(([pilot_id, totalPoints]) => ({ pilot_id, totalPoints }))
              .sort((a, b) => b.totalPoints - a.totalPoints) // Orden descendente por puntos
          });
        }

        // Encontramos la posición de nuestro piloto en cada carrera
        const pilotChampionshipPositions = championshipData.map(raceData => {
          const pilotStanding = raceData.standings.findIndex(
            standing => standing.pilot_id === pilotId
          );

          return {
            date: raceData.date,
            raceName: raceData.raceName,
            position: pilotStanding !== -1 ? pilotStanding + 1 : null // +1 porque el índice empieza en 0
          };
        }).filter(data => data.position !== null);

        // Preparamos datos para el gráfico
        setChampionshipPositionData({
          labels: pilotChampionshipPositions.map(p => format(new Date(p.date), 'MMM d', { locale: es })),
          datasets: [{
            data: pilotChampionshipPositions.map(p => p.position!)
          }],
          raceNames: pilotChampionshipPositions.map(p => p.raceName)
        });

      } catch (error) {
        console.error('Error in data fetching:', error);
        setError('Error loading data');
      } finally {
        setLoading(false);
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

  useEffect(() => {
    async function fetchResults() {
      setLoading(true);
      setError(null);
      try {
        // Trae los últimos resultados con join a carrera, piloto y sesión
        const { data, error } = await supabase
          .from('race_result')
          .select(`
            *,
            race (*),
            pilot (*),
            session (*)
          `)
          .order('created_at', { ascending: false })
          .limit(12);

        if (error) throw error;

        setResults(data || []);
      } catch (err) {
        setError('Error al cargar los resultados.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, []);

    // Filtra para quitar sesiones de clasificación
    const filteredResults = results.filter(
      (result) =>
        result.session &&
        !/clasificaci[oó]n|qualifying/i.test(result.session.name)
    );
  
    const formatRaceDate = (dateString: string) => {
      const date = new Date(dateString);
      return format(date, "d 'de' MMMM, yyyy", { locale: es });
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
                  <MaterialCommunityIcons name="calendar" size={24} color={colors.primary} />
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
                  <MaterialCommunityIcons name="medal" size={24} color={colors.primary} />
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="flag" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.totalRaces}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Carreras</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="medal" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.podiums}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Podiums</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="trophy" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.wins}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Victorias</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="target" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.bestPosition}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mejor posición</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="medal" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.polePosition}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poles</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="trending-up" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.totalPoints}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Puntos</Text>
                  </View>
                </View>
              </Card>
            )}

            {championshipPositionData && (
              <Card style={styles.chartCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Posición en el Campeonato</Text>
                  <MaterialCommunityIcons name="trending-up" size={24} color={colors.primary} />
                </View>

                <LineChart
                  data={{
                    labels: championshipPositionData.raceNames, // Usamos nombres de carrera en lugar de fechas
                    datasets: [{
                      data: championshipPositionData.datasets[0].data
                    }]
                  }}
                  width={screenWidth - 64}
                  height={220}
                  chartConfig={{
                    ...chartConfig,
                    formatYLabel: (value: string) => {
                      const position = parseInt(value);
                      return `${position}${position === 1 ? 'er' : 'º'}`;
                    },
                    // Ocultar etiquetas del eje X (nombres de carrera)
                    propsForLabels: {
                      ...chartConfig.propsForLabels,
                      opacity: 0 // Hacemos invisibles las etiquetas del eje X
                    }
                  }}
                  bezier
                  style={styles.chart}
                  fromZero={false}
                  yAxisLabel=""
                  segments={4}
                  withVerticalLines={false}
                  withInnerLines={false}
                  yAxisInterval={1}
                  verticalLabelRotation={0}
                  // Invertimos el eje Y manualmente
                  fromNumber={16}
                  toNumber={1}
                  getDotColor={(dataPoint, dataPointIndex) => {
                    const position = championshipPositionData.datasets[0].data[dataPointIndex];
                    if (position === 1) return '#FFD700'; // Oro
                    if (position === 2) return '#C0C0C0'; // Plata
                    if (position === 3) return '#CD7F32'; // Bronce
                    return colors.primary;
                  }}
                  formatTooltipY={(value: number) => `${value}${value === 1 ? 'er' : 'º'}`}
                  // Personalizamos el tooltip para mostrar el nombre de la carrera
                  decorator={() => (
                    <View style={{ width: 0, height: 0 }} /> // Esto es necesario para activar los tooltips
                  )}
                  getDotProps={(dataPoint, dataPointIndex) => {
                    return {
                      r: "6",
                      strokeWidth: "2",
                      stroke: colors.card,
                      // Añadimos etiqueta con el nombre de la carrera
                      children: (
                        <View style={styles.dotLabelContainer}>
                          <Text style={[styles.dotLabelText, { color: colors.text }]}>
                            {championshipPositionData.raceNames[dataPointIndex]}
                          </Text>
                        </View>
                      )
                    };
                  }}
                />
                <View style={styles.raceNamesContainer}>
                  {championshipPositionData.raceNames.map((name: string, index: number) => (
                    <Text key={index} style={[styles.raceNameLabel, { color: colors.textSecondary }]}>
                      {index + 1}. {name}
                    </Text>
                  ))}
                </View>
              </Card>
            )}

            {positionData && (
              <Card style={styles.chartCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Posiciones en Carrera</Text>
                  <MaterialCommunityIcons name="target" size={24} color={colors.primary} />
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
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                Últimos resultados
              </Text>
              <TouchableOpacity onPress={() => router.push('/races')}>
                <Text style={styles.seeAllText}>Ver todos</Text>
              </TouchableOpacity>
            </View>

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
            ) : filteredResults.length === 0 ? (
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                No hay resultados recientes disponibles.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.resultsScroll}>
                {filteredResults.map((result) => (
                  <TouchableOpacity
                    key={result.id}
                    onPress={() => router.push(`/race/${result.race_id}`)}
                    activeOpacity={0.85}
                  >
                    <Card style={styles.resultCard}>
                      <Text style={[styles.raceName, { color: colors.text }]} numberOfLines={1}>
                        {result.race?.name}
                      </Text>
                      <Text style={[styles.sessionName, { color: colors.primary }]}>
                        {result.session?.name}
                      </Text>
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
                      </View>
                      <View style={styles.resultDetailsRow}>
                        <MaterialCommunityIcons name="calendar" size={16} color={colors.textSecondary} />
                        <Text style={[styles.resultDate, { color: colors.textSecondary }]}>
                          {result.race?.date ? formatRaceDate(result.race.date) : ''}
                        </Text>
                        <MaterialCommunityIcons
                          name="star"
                          size={16}
                          color={colors.warning}
                          style={{ marginLeft: 12 }}
                        />
                        <Text style={[styles.points, { color: colors.text }]}>
                          {result.points ?? 0}
                        </Text>
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
  raceNamesContainer: {
    marginTop: 8,
    paddingHorizontal: 8,
  },
  raceNameLabel: {
    fontSize: 10,
    marginBottom: 2,
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllIcon: {
    marginLeft: 4,
  },
  resultsScroll: {
    paddingLeft: 16,
    paddingBottom: 16,
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
    width: 240,
    marginRight: 14,
    padding: 14,
    borderRadius: 18,
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
  dotLabelContainer: {
    position: 'absolute',
    top: -30, // Ajusta esta posición según necesites
    width: 120,
    padding: 4,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  dotLabelText: {
    fontSize: 10,
    textAlign: 'center',
  },
  sessionName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  pilotInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pilotName: {
    fontSize: 15,
    fontWeight: '600',
  },
  teamName: {
    fontSize: 12,
    marginTop: 2,
  },
  resultDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  resultDate: {
    fontSize: 13,
    marginLeft: 4,
  },
  points: {
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  position: {
    fontSize: 22,
    fontWeight: 'bold',
    width: 36,
    textAlign: 'center',
  },
  noDataText: {
    padding: 24,
    textAlign: 'center',
    fontSize: 16,
  },
});