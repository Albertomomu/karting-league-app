import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase, Season, Race } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'expo-router';

export default function RacesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function fetchSeasons() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('season')
          .select('*')
          .order('start_date', { ascending: false });

        if (error) throw error;

        setSeasons(data || []);

        // Set active season as default
        const activeSeason = data?.find(season => season.is_active);
        setSelectedSeason(activeSeason?.id || data?.[0]?.id || null);
      } catch (error) {
        console.error('Error fetching seasons:', error);
        setError('Error al cargar las temporadas');
      } finally {
        setLoading(false);
      }
    }

    fetchSeasons();
  }, []);

  useEffect(() => {
    async function fetchRaces() {
      if (!selectedSeason) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('race')
          .select('*')
          .eq('season_id', selectedSeason)
          .order('date', { ascending: true });

        if (error) throw error;

        setRaces(data || []);
      } catch (error) {
        console.error('Error fetching races:', error);
        setError('Error al cargar las carreras');
      } finally {
        setLoading(false);
      }
    }

    fetchRaces();
  }, [selectedSeason]);

  const getRaceStatus = (race: Race) => {
    const now = new Date();
    const raceDate = new Date(race.date);
    
    if (now > raceDate) {
      return {
        status: 'completed',
        text: 'Completada',
        color: colors.success,
        icon: 'check-circle'
      };
    } else if (now > new Date(raceDate.getTime() - 24 * 60 * 60 * 1000)) {
      return {
        status: 'ongoing',
        text: 'En curso',
        color: colors.warning,
        icon: 'alert-circle'
      };
    } else {
      return {
        status: 'upcoming',
        text: 'Próxima',
        color: colors.info,
        icon: 'calendar'
      };
    }
  };

  const formatRaceDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM, yyyy", { locale: es });
  };

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
        {races.map((race) => {
          const status = getRaceStatus(race);
          return (
            <Card key={race.id} style={styles.raceCard}>
              <View style={styles.raceHeader}>
                <Text style={[styles.raceName, { color: colors.text }]}>{race.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                  <MaterialCommunityIcons 
                    name={status.icon} 
                    size={16} 
                    color="#fff" 
                    style={styles.statusIcon}
                  />
                  <Text style={styles.statusText}>{status.text}</Text>
                </View>
              </View>
              
              <View style={styles.raceDetails}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons 
                    name="map-marker" 
                    size={18} 
                    color={colors.textSecondary} 
                  />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {race.circuit}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons 
                    name="calendar" 
                    size={18} 
                    color={colors.textSecondary} 
                  />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {formatRaceDate(race.date)}
                  </Text>
                </View>
              </View>
              
              // En RacesScreen.tsx, modifica la parte del renderRaces:
              {status.status === 'completed' && (
                <TouchableOpacity 
                  style={[styles.resultsButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push(`/race/${race.id}`)}
                >
                  <Text style={styles.resultsButtonText}>Ver resultados</Text>
                  <MaterialCommunityIcons 
                    name="chevron-right" 
                    size={20} 
                    color="#fff" 
                  />
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

      <View style={styles.seasonSelector}>
        <MaterialCommunityIcons name="calendar" size={24} color={colors.textSecondary} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.seasonScrollContent}
        >
          {seasons.map((season) => (
            <TouchableOpacity
              key={season.id}
              style={[
                styles.seasonButton,
                selectedSeason === season.id && { backgroundColor: colors.primaryLight }
              ]}
              onPress={() => setSelectedSeason(season.id)}
            >
              <Text
                style={[
                  styles.seasonButtonText,
                  { color: selectedSeason === season.id ? colors.primary : colors.textSecondary }
                ]}
              >
                {season.name}
              </Text>
              {season.is_active && (
                <View style={[styles.activeBadge, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderRaces()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  seasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  seasonScrollContent: {
    paddingLeft: 10,
  },
  seasonButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  seasonButtonText: {
    fontWeight: '500',
    fontSize: 14,
  },
  activeBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
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
  racesContainer: {
    marginBottom: 20,
  },
  raceCard: {
    marginBottom: 12,
    padding: 16,
  },
  raceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  raceName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  raceDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
  },
  resultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  resultsButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 4,
  },
});