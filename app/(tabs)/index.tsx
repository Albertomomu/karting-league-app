import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { LineChart } from 'react-native-chart-kit';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase, Race, RaceResult, LapTime, Pilot, Session } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [pilotStats, setPilotStats] = useState<any>(null);
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
              .sort((a, b) => b.totalPoints - a.totalPoints)
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
            position: pilotStanding !== -1 ? pilotStanding + 1 : null
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
        let query = supabase
          .from('race_result')
          .select(`
            *,
            race (*),
            pilot (*),
            session (*)
          `)
          .order('created_at', { ascending: false })
          .limit(12);

        if (pilot) {
          query = query.eq('pilot_id', pilot?.id);
        }

        const { data, error } = await query;

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
  }, [pilot]);

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

  const SkeletonLoader = ({ style, width, height }) => {
    const { colors } = useTheme();
    return (
      <View
        style={[
          {
            width,
            height,
            backgroundColor: colors.card,
            borderRadius: 8,
            overflow: 'hidden',
          },
          style,
        ]}
      >
        <LinearGradient
          colors={[colors.card, colors.primaryLight, colors.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            ...StyleSheet.absoluteFillObject,
            transform: [{ translateX: -width }],
          }}
        />
      </View>
    );
  };

  const NextRaceCardSkeleton = () => {
    const { colors } = useTheme();
    return (
      <Card style={styles.nextRaceCard}>
        <View style={styles.cardHeader}>
          <SkeletonLoader width={120} height={24} />
          <SkeletonLoader width={24} height={24} style={{ borderRadius: 12 }} />
        </View>
        <View style={styles.nextRaceContent}>
          <SkeletonLoader width={70} height={70} style={{ borderRadius: 12 }} />
          <View style={styles.raceInfo}>
            <SkeletonLoader width={200} height={20} style={{ marginBottom: 8 }} />
            <SkeletonLoader width={150} height={16} style={{ marginBottom: 6 }} />
            <SkeletonLoader width={180} height={16} />
          </View>
        </View>
      </Card>
    );
  };

  const StatsCardSkeleton = () => {
    return (
      <Card style={styles.statsCard}>
        <View style={styles.cardHeader}>
          <SkeletonLoader width={150} height={24} />
          <SkeletonLoader width={24} height={24} style={{ borderRadius: 12 }} />
        </View>
        <View style={styles.statsGrid}>
          {[...Array(6)].map((_, index) => (
            <View key={index} style={styles.statItem}>
              <SkeletonLoader width={40} height={40} style={{ borderRadius: 20, marginBottom: 8 }} />
              <SkeletonLoader width={30} height={20} style={{ marginBottom: 4 }} />
              <SkeletonLoader width={60} height={16} />
            </View>
          ))}
        </View>
      </Card>
    );
  };

  const ChartCardSkeleton = () => {
    return (
      <Card style={styles.graphCard}>
        <View style={styles.cardHeader}>
          <SkeletonLoader width={140} height={24} />
          <SkeletonLoader width={24} height={24} style={{ borderRadius: 12 }} />
        </View>
        <SkeletonLoader width={screenWidth - 64} height={180} style={{ marginTop: 8 }} />
      </Card>
    );
  };

  const ResultsCardSkeleton = () => {
    return (
      <Card style={styles.resultsCard}>
        <View style={styles.cardHeader}>
          <SkeletonLoader width={140} height={24} />
          <SkeletonLoader width={24} height={24} style={{ borderRadius: 12 }} />
        </View>
        <View style={styles.resultsList}>
          {[...Array(5)].map((_, idx) => (
            <View
              key={idx}
              style={[styles.resultItem, idx === 4 && styles.lastResultItem]}
            >
              <View style={styles.resultInfo}>
                <SkeletonLoader width={200} height={20} style={{ marginBottom: 4 }} />
                <SkeletonLoader width={150} height={16} />
              </View>
              <SkeletonLoader width={40} height={30} style={{ borderRadius: 4 }} />
            </View>
          ))}
        </View>
      </Card>
    );
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
          <>
            <NextRaceCardSkeleton />
            <StatsCardSkeleton />
            <ChartCardSkeleton />
            <ChartCardSkeleton />
            <ResultsCardSkeleton />
          </>
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
                      <MaterialCommunityIcons name="flag-checkered" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.totalRaces}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Carreras</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="podium" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.podiums}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Podios</Text>
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
                      <MaterialCommunityIcons name="medal-outline" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.totalPoints}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Puntos</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="numeric-1-circle" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.bestPosition}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mejor Posición</Text>
                  </View>
                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="flag-outline" size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.polePosition}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poles</Text>
                  </View>
                </View>
              </Card>
            )}

            {positionData && (
              <Card style={styles.graphCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Progresión carreras</Text>
                  <MaterialCommunityIcons name="chart-line" size={24} color={colors.primary} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <LineChart
                      data={positionData}
                      width={Math.max(screenWidth, positionData.labels.length * 60)}
                      height={180}
                      chartConfig={chartConfig}
                      bezier
                      style={{ marginLeft: -16, marginVertical: 8 }}
                      fromZero
                      yAxisLabel=""
                      yLabelsOffset={8}
                      withVerticalLines={false}
                      withHorizontalLines={true}
                      segments={5}
                      formatYLabel={y => `${y}`}
                    />
                  </View>
                </ScrollView>
              </Card>
            )}

            {championshipPositionData && (
              <Card style={styles.graphCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Progresión campeonato</Text>
                  <MaterialCommunityIcons name="trophy-outline" size={24} color={colors.primary} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <LineChart
                      data={championshipPositionData}
                      width={Math.max(screenWidth, championshipPositionData.labels.length * 60)}
                      height={180}
                      chartConfig={chartConfig}
                      bezier
                      style={{ marginLeft: -16, marginVertical: 8 }}
                      fromZero
                      yAxisLabel=""
                      yLabelsOffset={8}
                      withVerticalLines={false}
                      withHorizontalLines={true}
                      segments={5}
                      formatYLabel={y => `${y}`}
                    />
                  </View>
                </ScrollView>
              </Card>
            )}

            <Card style={styles.resultsCard}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Últimos resultados</Text>
                <MaterialCommunityIcons name="history" size={24} color={colors.primary} />
              </View>
              <View style={styles.resultsList}>
                {filteredResults.slice(0, 5).map((result, idx) => (
                  <TouchableOpacity
                    key={result.id}
                    style={[styles.resultItem, idx === filteredResults.length - 1 && styles.lastResultItem]}
                    onPress={() => router.push(`/race/${result.race.id}`)}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultRaceName, { color: colors.text }]} numberOfLines={1}>
                        {result.race?.name}
                      </Text>
                      <Text style={[styles.resultDate, { color: colors.textSecondary }]}>
                        {formatRaceDate(result.race?.date)}
                      </Text>
                    </View>
                    <View style={styles.resultPositionContainer}>
                      <Text style={[styles.resultPosition, { color: colors.primary }]}>
                        {result.race_position}
                      </Text>
                      <MaterialCommunityIcons name="flag-checkered" size={20} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
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
    padding: 16,
    paddingBottom: 8, // Menos espacio blanco al final
  },
  welcomeSection: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 32,
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextRaceCard: {
    marginBottom: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  nextRaceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circuitImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  raceInfo: {
    flex: 1,
  },
  raceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  raceCircuit: {
    fontSize: 14,
    marginTop: 2,
  },
  raceDate: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: 'bold',
  },
  statsCard: {
    marginBottom: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
    marginVertical: 8,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  graphCard: {
    marginBottom: 18,
  },
  resultsCard: {
    marginBottom: 0, // Elimina espacio blanco debajo
    paddingBottom: 4, // Ajusta para que quede pegado al final
  },
  resultsList: {
    marginTop: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    justifyContent: 'space-between',
  },
  lastResultItem: {
    borderBottomWidth: 0,
  },
  resultInfo: {
    flex: 1,
  },
  resultRaceName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  resultDate: {
    fontSize: 13,
    marginTop: 2,
  },
  resultPositionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  resultPosition: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
