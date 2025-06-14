import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase, Circuit } from '@/lib/supabase';

export default function CircuitsScreen() {
  const { colors } = useTheme();
  const [selectedCircuit, setSelectedCircuit] = useState<string | null>(null);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCircuits() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('circuit')
          .select('*')
          .order('name');

        if (error) {
          throw error;
        }

        setCircuits(data || []);
      } catch (error) {
        console.error('Error fetching circuits:', error);
        setError('No se pudieron cargar los circuitos. Por favor, inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    }

    fetchCircuits();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Circuitos" showBackButton={false} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Circuitos</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Explora los circuitos de karting en los que la Karting League ha realizado carreras:
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Cargando circuitos...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : circuits.length === 0 ? (
          <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
            No hay circuitos disponibles.
          </Text>
        ) : (
          circuits.map((circuit) => (
            <TouchableOpacity
              key={circuit.id}
              onPress={() => setSelectedCircuit(selectedCircuit === circuit.id ? null : circuit.id)}
            >
              <Card style={styles.circuitCard}>
                <Image
                  source={{ uri: circuit.image_url || 'https://images.unsplash.com/photo-1630925546089-7ac0e8028e9f?q=80&w=2070&auto=format&fit=crop' }}
                  style={styles.circuitImage}
                />

                <View style={styles.circuitInfo}>
                  <View style={styles.circuitHeader}>
                    <Text style={[styles.circuitName, { color: colors.text }]}>{circuit.name}</Text>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={24}
                      color={colors.primary}
                      style={{ transform: [{ rotate: selectedCircuit === circuit.id ? '90deg' : '0deg' }] }}
                    />
                  </View>

                  <View style={styles.circuitLocation}>
                    <MaterialCommunityIcons name="map-marker" size={24} color={colors.textSecondary} />
                    <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                      {circuit.location}
                    </Text>
                  </View>

                  <View style={styles.circuitStats}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>{circuit.length}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Longitud</Text>
                    </View>

                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>{circuit.turns}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Curvas</Text>
                    </View>

                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.text }]}>{circuit.record_lap_time || '-'}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Récord</Text>
                    </View>
                  </View>

                  {selectedCircuit === circuit.id && (
                    <View style={styles.expandedContent}>
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />

                      <View style={styles.recordHolder}>
                        <Text style={[styles.recordHolderLabel, { color: colors.textSecondary }]}>
                          Récord por:
                        </Text>
                        <Text style={[styles.recordHolderName, { color: colors.text }]}>
                          {circuit.record_lap_pilot || 'No establecido'}
                        </Text>
                      </View>

                      <View style={styles.descriptionContainer}>
                        <MaterialCommunityIcons name="information" size={24} color={colors.primary} style={styles.descriptionIcon} />
                        <Text style={[styles.description, { color: colors.text }]}>
                          {circuit.description || 'No hay descripción disponible para este circuito.'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.viewRacesButton, { backgroundColor: colors.primaryLight }]}
                      >
                        <Text style={[styles.viewRacesText, { color: colors.primary }]}>
                          Ver Carreras en este Circuito
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))
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
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    marginBottom: 20,
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
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  circuitCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  circuitImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  circuitInfo: {
    padding: 16,
  },
  circuitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  circuitName: {
    fontSize: 18,
    fontWeight: '600',
  },
  circuitLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 14,
  },
  circuitStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  expandedContent: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  recordHolder: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  recordHolderLabel: {
    fontSize: 14,
    marginRight: 6,
  },
  recordHolderName: {
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  descriptionIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  description: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  viewRacesButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewRacesText: {
    fontWeight: '500',
  },
});