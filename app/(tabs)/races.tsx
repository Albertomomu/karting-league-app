import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase, Season, Race, Pilot } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import SeasonSelector from '@/components/SeasonSelector';

type Circuit = {
  id: string;
  name: string;
  location?: string;
  image_url?: string;  // <--- campo añadido
};

type RaceWithCircuit = Race & {
  circuit?: Circuit;
};

export default function RacesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [races, setRaces] = useState<RaceWithCircuit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pilot, setPilot] = useState<Pilot | null>(null);
  const [pilotLeagueId, setPilotLeagueId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchPilot() {
      const { data: pilotData, error: pilotError } = await supabase
        .from('pilot')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      if (pilotError) throw pilotError;
      setPilot(pilotData);
    }

    async function fetchSeasons() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('season')
          .select('*')
          .order('is_active', { ascending: false })
          .order('start_date', { ascending: false });

        if (error) throw error;
        setSeasons(data || []);
        const active = data?.find(s => s.is_active);
        setSelectedSeason(active?.id || data?.[0]?.id || null);
      } catch (err) {
        console.error('Error fetching seasons:', err);
        setError('Error al cargar las temporadas');
      } finally {
        setLoading(false);
      }
    }

    fetchPilot();
    fetchSeasons();
  }, []);

  useEffect(() => {
    async function fetchPilotLeague() {
      if (!pilot || !selectedSeason) return;
      const { data, error } = await supabase
        .from('pilot_team_season')
        .select('league_id')
        .eq('pilot_id', pilot.id)
        .eq('season_id', selectedSeason)
        .single();
      if (error) {
        console.error('Error al obtener la liga del piloto:', error);
        setPilotLeagueId(null);
      } else {
        setPilotLeagueId(data.league_id);
      }
    }
    fetchPilotLeague();
  }, [pilot, selectedSeason]);

  useEffect(() => {
    async function fetchRaces() {
      if (!selectedSeason || !pilotLeagueId) return;
      try {
        setLoading(true);
        setError(null);
        const { data: racesData, error: racesError } = await supabase
          .from('race')
          .select(`
            *,
            circuit (
              id,
              name,
              location,
              image_url
            )
          `)
          .eq('league_id', pilotLeagueId)
          .order('date', { ascending: true });

        if (racesError) throw racesError;
        setRaces(racesData || []);
      } catch (err) {
        console.error('Error fetching races:', err);
        setError('Error al cargar las carreras');
      } finally {
        setLoading(false);
      }
    }
    fetchRaces();
  }, [selectedSeason, pilotLeagueId]);

  const getRaceStatus = (race: Race) => {
    const now = new Date();
    const raceDate = new Date(race.date);
    if (now > raceDate) {
      return { status: 'completed', text: 'Completada', color: colors.success, icon: 'check-circle' };
    } else if (now > new Date(raceDate.getTime() - 24 * 60 * 60 * 1000)) {
      return { status: 'ongoing', text: 'En curso', color: colors.warning, icon: 'alert-circle' };
    } else {
      return { status: 'upcoming', text: 'Próxima', color: colors.info, icon: 'calendar' };
    }
  };

  const formatRaceDate = (dateString: string) =>
    format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es });

  const renderRaces = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando carreras...
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
    if (races.length === 0) {
      return (
        <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
          No hay carreras programadas para esta temporada
        </Text>
      );
    }

    return (
      <View style={styles.racesContainer}>
        {races.map(race => {
          const status = getRaceStatus(race);
          return (
            <Card key={race.id} style={styles.raceCard}>
              {/* Imagen del circuito */}
              {race.circuit?.image_url && (
                <Image
                  source={{ uri: race.circuit.image_url }}
                  style={styles.circuitImage}
                  resizeMode="cover"
                />
              )}

              {/* Encabezado */}
              <View style={styles.raceHeader}>
                <Text style={[styles.raceName, { color: colors.text }]} numberOfLines={1}>
                  {race.name}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                  <MaterialCommunityIcons
                    name={status.icon as any}
                    size={16}
                    color="#fff"
                    style={styles.statusIcon}
                  />
                  <Text style={styles.statusText}>{status.text}</Text>
                </View>
              </View>

              {/* Detalles */}
              <View style={styles.raceDetails}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="map-marker" size={18} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {race.circuit?.location || 'Sin localización'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="calendar" size={18} color={colors.textSecondary} />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {formatRaceDate(race.date)}
                  </Text>
                </View>
              </View>

              {/* Botón de resultados */}
              {status.status === 'completed' && (
                <TouchableOpacity
                  style={[styles.resultsButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push(`/race/${race.id}`)}
                >
                  <Text style={styles.resultsButtonText}>Ver resultados</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </Card>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Carreras" showBackButton={false} />

      <SeasonSelector
        seasons={seasons}
        selectedSeason={selectedSeason}
        onSelect={setSelectedSeason}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderRaces()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  scrollView: { flex: 1, paddingHorizontal: 16 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: { marginTop: 10, fontSize: 16 },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: { fontSize: 16 },

  noDataText: { textAlign: 'center', padding: 20, fontSize: 16 },

  racesContainer: { marginBottom: 20 },

  raceCard: { marginBottom: 12, padding: 0, overflow: 'hidden' },

  circuitImage: {
    width: '100%',
    height: 120,
  },

  raceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  raceName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusIcon: { marginRight: 4 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  raceDetails: { paddingHorizontal: 12, paddingBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  detailText: { marginLeft: 8, fontSize: 14 },

  resultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  resultsButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 4,
  },
});
