import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import SeasonSelector from '@/components/SeasonSelector';
import Toast from 'react-native-toast-message';

export default function StandingsScreen() {
  const { colors } = useTheme();
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [leagueIds, setLeagueIds] = useState<string[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fetchStandings = useCallback(async () => {
    if (!leagueIds.length) return;
    setLoading(true);
    setError(null);
    try {
      const { data: results, error } = await supabase
        .from('race_result')
        .select('pilot_id, points, pilot:pilot(id, name, image_url), race:race(id, league_id)')
        .in('race.league_id', leagueIds);

      if (error) throw error;

      const standingsMap: Record<string, { pilot: any, totalPoints: number, races: number }> = {};
      for (const r of results) {
        if (!standingsMap[r.pilot_id]) {
          standingsMap[r.pilot_id] = {
            pilot: r.pilot,
            totalPoints: 0,
            races: 0,
          };
        }
        standingsMap[r.pilot_id].totalPoints += r.points || 0;
        standingsMap[r.pilot_id].races += 1;
      }
      const standingsArr = Object.values(standingsMap)
        .sort((a, b) => b.totalPoints - a.totalPoints);

      setStandings(standingsArr);

      Toast.show({
        type: 'success',
        text1: 'Clasificación actualizada',
        text2: 'Se han actualizado los puntos de todos los pilotos',
        position: 'top',
      });
    } catch (err) {
      setError('Error cargando clasificación');
      Toast.show({
        type: 'error',
        text1: 'Error al cargar clasificación',
        text2: err instanceof Error ? err.message : 'Error desconocido',
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  }, [leagueIds]);

  useEffect(() => {
    fetchStandings();
  }, [leagueIds, fetchStandings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStandings();
    setRefreshing(false);
  }, [fetchStandings]);

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

        <Text style={[styles.title, { color: colors.text }]}>Clasificación General</Text>

        {loading ? (
          <Text style={{ color: colors.text, marginTop: 24 }}>Cargando...</Text>
        ) : error ? (
          <Text style={{ color: colors.error, marginTop: 24 }}>{error}</Text>
        ) : standings.length === 0 ? (
          <Text style={{ color: colors.text, marginTop: 24 }}>No hay datos para esta temporada.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, { width: 32 }]}>#</Text>
              <Text style={[styles.headerCell, { flex: 1 }]}>Piloto</Text>
              <Text style={[styles.headerCell, { width: 70, textAlign: 'right' }]}>Puntos</Text>
              <Text style={[styles.headerCell, { width: 60, textAlign: 'right' }]}>Carreras</Text>
            </View>
            {standings.map((row, idx) => (
              <View key={row.pilot.id} style={styles.row}>
                <Text style={[styles.position, { color: colors.primary }]}>{idx + 1}</Text>
                <View style={styles.pilotCell}>
                  {row.pilot.image_url ? (
                    <Image
                      source={{ uri: row.pilot.image_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: '#ccc' }]} />
                  )}
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {row.pilot.name}
                  </Text>
                </View>
                <Text style={[styles.points, { color: colors.text }]}>{row.totalPoints}</Text>
                <Text style={[styles.races, { color: colors.textSecondary }]}>{row.races}</Text>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 0, // No padding top para que el título esté bien alineado
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 10, // Si quieres más separación, ajusta aquí
    alignSelf: 'flex-start',
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
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  position: { width: 32, fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
  pilotCell: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8, backgroundColor: '#eee' },
  name: { fontSize: 15, flexShrink: 1 },
  points: { width: 70, textAlign: 'right', fontWeight: 'bold', fontSize: 15 },
  races: { width: 60, textAlign: 'right', fontSize: 14 },
});
