import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import NextRaceCard from '@/components/NextRaceCard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase, Race, RaceResult, Pilot, Session } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import StatsCard from '@/components/StatsCard';
import LineChartCard from '@/components/LineChartCard';
import LastResultsCard from '@/components/LastResultsCard';
import {
  NextRaceCardSkeleton,
  StatsCardSkeleton,
  ChartCardSkeleton,
  ResultsCardSkeleton,
} from '@/components/Skeletons';
import SeasonSelector from '@/components/SeasonSelector';

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
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
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

        // Get seasons for current user
        // Paso 1: obtener los season_id donde el piloto participa
        const { data: pilotSeasonRows, error: pilotSeasonError } = await supabase
        .from('pilot_team_season')
        .select('season_id')
        .eq('pilot_id', pilotId);

        if (pilotSeasonError) throw pilotSeasonError;

        const seasonIds = pilotSeasonRows?.map(row => row.season_id) || [];

        if (seasonIds.length === 0) {
        setSeasons([]);
        setSelectedSeasonId(null);
        return;
        }

        // Paso 2: traer datos de esas seasons
        const { data: seasonsData, error: seasonsError } = await supabase
        .from('season')
        .select('id, name, is_active')
        .in('id', seasonIds);

        if (seasonsError) throw seasonsError;

        // Ordenar con la activa al principio
        const sortedSeasons = seasonsData.sort((a, b) => {
        if (a.is_active) return -1;
        if (b.is_active) return 1;
        return a.name.localeCompare(b.name);
        });

        setSeasons(sortedSeasons);
        setSelectedSeasonId(sortedSeasons[0]?.id || null);

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

        // Get the league ID for the selected season
        const { data: ptsData, error: ptsError } = await supabase
        .from('pilot_team_season')
        .select('league_id')
        .eq('pilot_id', pilotId)
        .eq('season_id', selectedSeasonId)
        .single();

        if (ptsError) throw ptsError;

        const leagueId = ptsData.league_id;

        // Fetch race results for that league
        const { data: statsData, error: statsError } = await supabase
        .from('race_result')
        .select(`
          race_position,
          points,
          best_lap,
          session (name),
          race:race!inner(id, league_id)
        `)
        .eq('pilot_id', pilotId)
        .eq('race.league_id', leagueId);

        if (statsError) throw statsError;

        const processedStats = statsData.map(r => ({
        race_position: r.race_position,
        points: r.points,
        best_lap: r.best_lap,
        session_name: r.session?.name || null
        }));

        const stats = {
        totalRaces: processedStats.filter(r => r.session_name?.toLowerCase().includes('carrera')).length,
        podiums: processedStats.filter(r => r.session_name?.toLowerCase().includes('carrera') && r.race_position <= 3).length,
        wins: processedStats.filter(r => r.session_name?.toLowerCase().includes('carrera') && r.race_position === 1).length,
        totalPoints: processedStats.reduce((sum, r) => sum + (r.points || 0), 0),
        bestPosition: Math.min(
          ...processedStats
            .filter(r => r.session_name?.toLowerCase().includes('carrera'))
            .map(r => r.race_position ?? 999)
        ),
        polePosition: processedStats.filter(
          r => r.session_name?.toLowerCase().includes('clasificación') && r.race_position === 1
        ).length
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

        // Fetch championship position progression
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

        const processedResults = (allResultsData as any[]).filter(r => r.race !== null).map(r => ({
          pilot_id: r.pilot_id,
          points: r.points || 0,
          race_id: r.race.id,
          date: r.race.date,
          race_name: r.race.name
        }));

        // Agrupamos por carrera (ordenadas por fecha)
        const races = Array.from(new Set(processedResults.map(r => r.race_id)))
          .map(raceId => {
            const raceData = processedResults.find(r => r.race_id === raceId);
            return {
              id: raceId,
              date: raceData?.date || '',
              name: raceData?.race_name || ''
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
            <SeasonSelector
              seasons={seasons}
              selectedSeason={selectedSeasonId}
              onSelect={setSelectedSeasonId}
            />

            {nextRace && (
              <NextRaceCard race={nextRace as Race & { circuit?: { name?: string; image_url?: string } } } />
            )}

            {pilotStats && (
              <StatsCard stats={pilotStats} />
            )}

            {positionData && (
              <LineChartCard
                title="Progresión carreras"
                icon="chart-line"
                chartData={positionData}
              />
            )}

            {championshipPositionData && (
              <LineChartCard
                title="Progresión campeonato"
                icon="trophy-outline"
                chartData={championshipPositionData}
              />
            )}

            {filteredResults && (
              <LastResultsCard
                results={filteredResults}
                onResultPress={(raceId) => router.push(`/race/${raceId}`)}
              />
            )}
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
