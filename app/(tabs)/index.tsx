import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
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
import Toast from 'react-native-toast-message';

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
  const [leagueIds, setLeagueIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // 1. Fetch pilot and seasons
  useEffect(() => {
    async function fetchPilotAndSeasons() {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        setPilot(null);
        setSeasons([]);
        setSelectedSeasonId(null);
        setLeagueIds([]);

        const { data: pilotData, error: pilotError } = await supabase
          .from('pilot')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (pilotError) throw pilotError;
        setPilot(pilotData);

        const pilotId = pilotData.id;

        const { data: pilotSeasonRows, error: pilotSeasonError } = await supabase
          .from('pilot_team_season')
          .select('season_id')
          .eq('pilot_id', pilotId);

        if (pilotSeasonError) throw pilotSeasonError;

        const seasonIds = pilotSeasonRows.map(row => row.season_id);

        if (seasonIds.length === 0) return;

        const { data: seasonsData, error: seasonsError } = await supabase
          .from('season')
          .select('id, name, is_active')
          .in('id', seasonIds);

        if (seasonsError) throw seasonsError;

        const sortedSeasons = seasonsData.sort((a, b) => {
          if (a.is_active) return -1;
          if (b.is_active) return 1;
          return a.name.localeCompare(b.name);
        });

        setSeasons(sortedSeasons);

        setSelectedSeasonId(sortedSeasons[0]?.id || null);
      } catch (error) {
        console.error('Error fetching pilot/seasons:', error);
        setError('Error cargando datos del piloto');
      } finally {
        setLoading(false);
      }
    }

    fetchPilotAndSeasons();
  }, [user]);

  // 2. Fetch leagues for the selected season
  useEffect(() => {
    async function fetchLeagues() {
      if (!selectedSeasonId) return;
      try {
        const { data: leagues, error: leaguesError } = await supabase
          .from('league')
          .select('id')
          .eq('season_id', selectedSeasonId);

        if (leaguesError) throw leaguesError;
        setLeagueIds(leagues.map(l => l.id));
      } catch (error) {
        console.error('Error fetching leagues:', error);
        setError('Error cargando las ligas');
      }
    }
    fetchLeagues();
  }, [selectedSeasonId]);

  // 3. Fetch everything else (Next race, stats, charts)
  const fetchEverythingElse = useCallback(async () => {
    if (!pilot || leagueIds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const pilotId = pilot.id;

      // Next race
      const { data: nextRaceData, error: nextRaceError } = await supabase
        .from('race')
        .select('*, circuit (*)')
        .in('league_id', leagueIds)
        .gt('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(1)
        .single();

      if (!nextRaceError) setNextRace(nextRaceData);

      // Stats
      const { data: statsData, error: statsError } = await supabase
        .from('race_result')
        .select(`race_position, points, best_lap, session (name), race:race!inner(id, league_id)`)
        .eq('pilot_id', pilotId)
        .in('race.league_id', leagueIds);

      if (statsError) throw statsError;

      const processedStats = statsData.map(r => ({
        race_position: r.race_position,
        points: r.points,
        best_lap: r.best_lap,
        session_name: r.session?.name || null,
      }));

      // Mejor posición robusto
      const carrerasStats = processedStats.filter(
        r => r.session_name?.toLowerCase().includes('carrera') && typeof r.race_position === 'number'
      );
      const bestPosition =
        carrerasStats.length > 0
          ? Math.min(...carrerasStats.map(r => r.race_position))
          : null;

      const stats = {
        totalRaces: carrerasStats.length,
        podiums: carrerasStats.filter(r => r.race_position <= 3).length,
        wins: carrerasStats.filter(r => r.race_position === 1).length,
        totalPoints: processedStats.reduce((sum, r) => sum + (r.points || 0), 0),
        bestPosition: bestPosition,
        polePosition: processedStats.filter(
          r => r.session_name?.toLowerCase().includes('clasificación') && r.race_position === 1
        ).length,
      };

      setPilotStats(stats);

      // Progreso por carrera
      const { data: positionsData, error: positionsError } = await supabase
        .from('race_result')
        .select(`race_position, race:race!inner(id, date, league_id)`)
        .eq('pilot_id', pilotId)
        .in('race.league_id', leagueIds)
        .in('session_id', [
          '483d8139-1a8a-4ede-a738-d75fb0cb8849', // Carrera I
          '149d57f5-b84f-4518-b174-d8674c581def'  // Carrera II
        ])
        .order('date', { foreignTable: 'race', ascending: true });

      if (positionsError) throw positionsError;

      const validPositions = positionsData
        .filter(p => p.race !== null && p.race_position !== null)
        .map(p => ({
          position: p.race_position!,
          date: p.race!.date
        }));

        // Progreso por carrera
        if (validPositions.length > 0) {
          setPositionData({
            labels: validPositions.map(p => format(new Date(p.date), 'MMM d', { locale: es })),
            datasets: [{
              data: validPositions.map(p => p.position)
            }]
          });
        } else {
          setPositionData(null);
        }

      // Progreso campeonato
      const { data: allResultsData, error: allResultsError } = await supabase
        .from('race_result')
        .select(`pilot_id, points, race (id, date, name, league_id)`)
        .in('race.league_id', leagueIds)
        .order('date', { foreignTable: 'race', ascending: true });

      if (allResultsError) throw allResultsError;

      const processedResults = (allResultsData as any[]).filter(r => r.race !== null).map(r => ({
        pilot_id: r.pilot_id,
        points: r.points || 0,
        race_id: r.race.id,
        date: r.race.date,
        race_name: r.race.name
      }));

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
        const raceResults = processedResults.filter(r => r.race_id === race.id);

        for (const result of raceResults) {
          accumulatedPoints[result.pilot_id] =
            (accumulatedPoints[result.pilot_id] || 0) + result.points;
        }

        championshipData.push({
          raceId: race.id,
          date: race.date,
          raceName: race.name,
          standings: Object.entries(accumulatedPoints)
            .map(([pilot_id, totalPoints]) => ({ pilot_id, totalPoints }))
            .sort((a, b) => b.totalPoints - a.totalPoints)
        });
      }

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

      // Progreso campeonato
      if (pilotChampionshipPositions.length > 0) {
        setChampionshipPositionData({
          labels: pilotChampionshipPositions.map(p => format(new Date(p.date), 'MMM d', { locale: es })),
          datasets: [{
            data: pilotChampionshipPositions.map(p => p.position!)
          }],
          raceNames: pilotChampionshipPositions.map(p => p.raceName)
        });
      } else {
        setChampionshipPositionData(null);
      }

      Toast.show({
        type: 'success',
        text1: 'Datos cargados',
        text2: 'Se han actualizado los datos correctamente.',
        position: 'top',
      });

    } catch (error) {
      console.error('Error fetching league-related data:', error);
      setError('Error cargando datos de la liga');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se han podido cargar los datos.',
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  }, [pilot, leagueIds]);

  useEffect(() => {
    fetchEverythingElse();
  }, [pilot, leagueIds, fetchEverythingElse]);

  // 4. Fetch results (filtrado por leagueIds)
  const fetchResults = useCallback(async () => {
    if (!pilot || leagueIds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('race_result')
        .select(`*, race:race!inner(*), pilot (*), session (*)`)
        .eq('pilot_id', pilot.id)
        .in('race.league_id', leagueIds)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error(err);
      setError('Error loading results');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se han podido cargar los resultados.',
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  }, [pilot, leagueIds]);

  useEffect(() => {
    fetchResults();
  }, [pilot, leagueIds, fetchResults]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchEverythingElse(),
        fetchResults()
      ]);
      Toast.show({
        type: 'success',
        text1: 'Datos actualizados',
        position: 'top',
      });
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Error al actualizar',
        text2: e.message || 'Inténtalo de nuevo',
        position: 'top',
      });
    }
    setRefreshing(false);
  }, [fetchEverythingElse, fetchResults]);

  const filteredResults = results.filter(
    result => result.session && !/clasificaci[oó]n|qualifying/i.test(result.session.name)
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Karting League" showBackButton={false} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.background}
          />
        }
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
              <StatsCard
                stats={{
                  ...pilotStats,
                  bestPosition: pilotStats.bestPosition !== null ? pilotStats.bestPosition : '-'
                }}
              />
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
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 8 },
  welcomeSection: { marginBottom: 16 },
  welcomeText: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginTop: 4 },
  loadingContainer: { flex: 1, alignItems: 'center', marginTop: 32 },
  loadingText: { marginTop: 12, fontSize: 16 },
  errorContainer: { flex: 1, alignItems: 'center', marginTop: 32 },
  errorText: { fontSize: 16, fontWeight: 'bold' },
});
