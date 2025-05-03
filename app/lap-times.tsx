import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase, LapTime, Circuit, Pilot, Race } from '@/lib/supabase';

export default function LapTimesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('view');
  const [selectedCircuit, setSelectedCircuit] = useState('all');
  const [selectedSession, setSelectedSession] = useState('all');
  const [showCircuitDropdown, setShowCircuitDropdown] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [lapTimes, setLapTimes] = useState<LapTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for adding lap times (for organizers)
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedPilot, setSelectedPilot] = useState<string | null>(null);
  const [selectedRace, setSelectedRace] = useState<string | null>(null);
  const [lapNumber, setLapNumber] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [milliseconds, setMilliseconds] = useState('');
  const [formSession, setFormSession] = useState('race1');
  const [showFormSessionDropdown, setShowFormSessionDropdown] = useState(false);
  const [showPilotDropdown, setShowPilotDropdown] = useState(false);
  const [showRaceDropdown, setShowRaceDropdown] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const sessions = [
    { id: 'all', name: 'Todas las Sesiones' },
    { id: 'practice', name: 'Práctica' },
    { id: 'qualifying', name: 'Clasificación' },
    { id: 'race1', name: 'Carrera 1' },
    { id: 'race2', name: 'Carrera 2' }
  ];

  const formSessions = [
    { id: 'practice', name: 'Práctica' },
    { id: 'qualifying', name: 'Clasificación' },
    { id: 'race1', name: 'Carrera 1' },
    { id: 'race2', name: 'Carrera 2' }
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch circuits
        const { data: circuitsData, error: circuitsError } = await supabase
          .from('circuits')
          .select('*')
          .order('name');

        if (circuitsError) {
          throw circuitsError;
        }

        setCircuits(circuitsData || []);

        // Fetch lap times
        await fetchLapTimes();

        // For organizers, fetch pilots and races for the form
        if (user?.user_metadata?.role === 'organizer') {
          const { data: pilotsData, error: pilotsError } = await supabase
            .from('pilots')
            .select('*, team:teams(name)')
            .order('number');

          if (pilotsError) {
            throw pilotsError;
          }

          setPilots(pilotsData || []);

          const { data: racesData, error: racesError } = await supabase
            .from('races')
            .select('*')
            .order('date', { ascending: false });

          if (racesError) {
            throw racesError;
          }

          setRaces(racesData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const fetchLapTimes = async () => {
    try {
      let query = supabase
        .from('lap_times')
        .select(`
          *,
          pilot:pilots(id, name, number),
          race:races(id, name, circuit_id, circuit_name)
        `)
        .order('created_at', { ascending: false });

      if (selectedCircuit !== 'all') {
        query = query.eq('race.circuit_id', selectedCircuit);
      }

      if (selectedSession !== 'all') {
        query = query.eq('session_type', selectedSession);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setLapTimes(data || []);
    } catch (error) {
      console.error('Error fetching lap times:', error);
      setError('Error al cargar los tiempos de vuelta');
    }
  };

  useEffect(() => {
    fetchLapTimes();
  }, [selectedCircuit, selectedSession]);

  const handleAddLapTime = async () => {
    if (!selectedPilot || !selectedRace || !lapNumber || !minutes || !seconds || !milliseconds) {
      setFormError('Por favor, completa todos los campos');
      return;
    }

    try {
      setFormLoading(true);
      setFormError(null);
      setFormSuccess(null);

      const time = `${minutes}:${seconds}.${milliseconds}`;

      // Calculate improvement (mock for now)
      const improvement = `-0.${Math.floor(Math.random() * 900) + 100}`;

      const { error } = await supabase
        .from('lap_times')
        .insert({
          race_id: selectedRace,
          pilot_id: selectedPilot,
          session_type: formSession,
          lap_number: parseInt(lapNumber),
          time,
          improvement
        });

      if (error) {
        throw error;
      }

      // Reset form
      setLapNumber('');
      setMinutes('');
      setSeconds('');
      setMilliseconds('');

      setFormSuccess('Tiempo de vuelta añadido correctamente');

      // Refresh lap times
      fetchLapTimes();
    } catch (error) {
      console.error('Error adding lap time:', error);
      setFormError('Error al añadir el tiempo de vuelta');
    } finally {
      setFormLoading(false);
    }
  };

  const getSessionName = (sessionType: string) => {
    switch (sessionType) {
      case 'practice': return 'Práctica';
      case 'qualifying': return 'Clasificación';
      case 'race1': return 'Carrera 1';
      case 'race2': return 'Carrera 2';
      default: return sessionType;
    }
  };

  const isOrganizer = user?.user_metadata?.role === 'organizer';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Tiempos de Vuelta" showBackButton={false} />

      {isOrganizer && (
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'view' && { ...styles.activeTab, borderColor: colors.primary }
            ]}
            onPress={() => setActiveTab('view')}
          >
            <MaterialCommunityIcons
              name="clock-outline"
              size={24}
              color={activeTab === 'view' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'view' ? colors.primary : colors.textSecondary }
              ]}
            >
              Ver Tiempos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'add' && { ...styles.activeTab, borderColor: colors.primary }
            ]}
            onPress={() => setActiveTab('add')}
          >
            <MaterialCommunityIcons
              name="plus"
              size={24}
              color={activeTab === 'add' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'add' ? colors.primary : colors.textSecondary }
              ]}
            >
              Añadir Tiempos
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'view' ? (
        <>
          <View style={styles.filtersContainer}>
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                <MaterialCommunityIcons name="filter" size={16} color={colors.textSecondary} style={styles.filterIcon} />
                Filtros:
              </Text>

              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[styles.dropdown, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowCircuitDropdown(!showCircuitDropdown);
                    setShowSessionDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownText, { color: colors.text }]}>
                    {selectedCircuit === 'all'
                      ? 'Todos los Circuitos'
                      : circuits.find(c => c.id === selectedCircuit)?.name || 'Seleccionar Circuito'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                {showCircuitDropdown && (
                  <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity
                      key="all"
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedCircuit('all');
                        setShowCircuitDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: colors.text }]}>Todos los Circuitos</Text>
                      {selectedCircuit === 'all' && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
                    </TouchableOpacity>

                    {circuits.map((circuit) => (
                      <TouchableOpacity
                        key={circuit.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedCircuit(circuit.id);
                          setShowCircuitDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text }]}>{circuit.name}</Text>
                        {selectedCircuit === circuit.id && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[styles.dropdown, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowSessionDropdown(!showSessionDropdown);
                    setShowCircuitDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownText, { color: colors.text }]}>
                    {sessions.find(s => s.id === selectedSession)?.name || 'Seleccionar Sesión'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                {showSessionDropdown && (
                  <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {sessions.map((session) => (
                      <TouchableOpacity
                        key={session.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedSession(session.id);
                          setShowSessionDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text }]}>{session.name}</Text>
                        {selectedSession === session.id && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Cargando tiempos de vuelta...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            ) : (
              <View style={styles.lapTimesContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.pilotHeader, { color: colors.textSecondary }]}>Piloto</Text>
                  <Text style={[styles.lapHeader, { color: colors.textSecondary }]}>Vuelta</Text>
                  <Text style={[styles.timeHeader, { color: colors.textSecondary }]}>Tiempo</Text>
                  <Text style={[styles.improvementHeader, { color: colors.textSecondary }]}>Mejora</Text>
                </View>

                {lapTimes.length > 0 ? (
                  lapTimes.map((lap) => (
                    <Card key={lap.id} style={styles.lapTimeCard}>
                      <View style={styles.lapTimeRow}>
                        <View style={styles.pilotContainer}>
                          <View style={[styles.pilotNumber, { backgroundColor: colors.primary }]}>
                            <Text style={[styles.pilotNumberText, { color: colors.white }]}>
                              {lap.pilot?.number || '00'}
                            </Text>
                          </View>
                          <Text style={[styles.pilotName, { color: colors.text }]}>
                            {lap.pilot?.name || 'Piloto Desconocido'}
                          </Text>
                        </View>

                        <Text style={[styles.lapNumber, { color: colors.text }]}>{lap.lap_number}</Text>

                        <Text style={[styles.lapTime, { color: colors.text }]}>{lap.time}</Text>

                        <Text style={[styles.improvement, { color: colors.success }]}>
                          {lap.improvement || '-'}
                        </Text>
                      </View>

                      <View style={styles.lapTimeFooter}>
                        <Text style={[styles.sessionInfo, { color: colors.textSecondary }]}>
                          {lap.race?.circuit_name || 'Circuito Desconocido'} • {getSessionName(lap.session_type)}
                        </Text>
                      </View>
                    </Card>
                  ))
                ) : (
                  <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                    No se encontraron tiempos de vuelta para los filtros seleccionados
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        </>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Card style={styles.formCard}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Añadir Nuevo Tiempo de Vuelta</Text>

            {formError && (
              <View style={[styles.formErrorContainer, { backgroundColor: colors.errorLight }]}>
                <Text style={[styles.formErrorText, { color: colors.error }]}>{formError}</Text>
              </View>
            )}

            {formSuccess && (
              <View style={[styles.formSuccessContainer, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.formSuccessText, { color: colors.success }]}>{formSuccess}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Piloto</Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[styles.dropdown, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowPilotDropdown(!showPilotDropdown);
                    setShowRaceDropdown(false);
                    setShowFormSessionDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownText, { color: colors.text }]}>
                    {selectedPilot
                      ? pilots.find(p => p.id === selectedPilot)?.name || 'Seleccionar Piloto'
                      : 'Seleccionar Piloto'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                {showPilotDropdown && (
                  <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {pilots.map((pilot) => (
                      <TouchableOpacity
                        key={pilot.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedPilot(pilot.id);
                          setShowPilotDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text }]}>
                          {pilot.number} - {pilot.name}
                        </Text>
                        {selectedPilot === pilot.id && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Carrera</Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[styles.dropdown, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowRaceDropdown(!showRaceDropdown);
                    setShowPilotDropdown(false);
                    setShowFormSessionDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownText, { color: colors.text }]}>
                    {selectedRace
                      ? races.find(r => r.id === selectedRace)?.name || 'Seleccionar Carrera'
                      : 'Seleccionar Carrera'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                {showRaceDropdown && (
                  <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {races.map((race) => (
                      <TouchableOpacity
                        key={race.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedRace(race.id);
                          setShowRaceDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text }]}>
                          {race.name} ({new Date(race.date).toLocaleDateString('es-ES')})
                        </Text>
                        {selectedRace === race.id && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Número de Vuelta</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="Número de vuelta"
                placeholderTextColor={colors.textSecondary}
                value={lapNumber}
                onChangeText={setLapNumber}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Tiempo de Vuelta</Text>
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={[styles.timeInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="MM"
                  placeholderTextColor={colors.textSecondary}
                  value={minutes}
                  onChangeText={setMinutes}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>
                <TextInput
                  style={[styles.timeInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="SS"
                  placeholderTextColor={colors.textSecondary}
                  value={seconds}
                  onChangeText={setSeconds}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={[styles.timeSeparator, { color: colors.text }]}>.</Text>
                <TextInput
                  style={[styles.timeInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="ms"
                  placeholderTextColor={colors.textSecondary}
                  value={milliseconds}
                  onChangeText={setMilliseconds}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Sesión</Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[styles.dropdown, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowFormSessionDropdown(!showFormSessionDropdown);
                    setShowPilotDropdown(false);
                    setShowRaceDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownText, { color: colors.text }]}>
                    {formSessions.find(s => s.id === formSession)?.name || 'Seleccionar Sesión'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                {showFormSessionDropdown && (
                  <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {formSessions.map((session) => (
                      <TouchableOpacity
                        key={session.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormSession(session.id);
                          setShowFormSessionDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text }]}>{session.name}</Text>
                        {formSession === session.id && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleAddLapTime}
              disabled={formLoading}
            >
              {formLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.submitButtonText, { color: colors.white }]}>Añadir Tiempo de Vuelta</Text>
              )}
            </TouchableOpacity>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: {
    borderWidth: 1,
  },
  tabText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIcon: {
    marginRight: 4,
  },
  dropdownContainer: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
    zIndex: 1,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    minWidth: 140,
  },
  dropdownText: {
    fontSize: 14,
    marginRight: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    zIndex: 2,
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownItemText: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
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
  lapTimesContainer: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  pilotHeader: {
    flex: 2,
    fontSize: 14,
    fontWeight: '500',
  },
  lapHeader: {
    width: 40,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  timeHeader: {
    width: 80,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  improvementHeader: {
    width: 60,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  lapTimeCard: {
    marginBottom: 8,
  },
  lapTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  pilotContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pilotNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pilotNumberText: {
    fontWeight: '700',
    fontSize: 14,
  },
  pilotName: {
    fontWeight: '500',
    fontSize: 14,
  },
  lapNumber: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
  },
  lapTime: {
    width: 80,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  improvement: {
    width: 60,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '500',
  },
  lapTimeFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
    paddingTop: 8,
    marginTop: 4,
  },
  sessionInfo: {
    fontSize: 12,
  },
  noDataText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
  formCard: {
    padding: 16,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  formErrorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  formErrorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formSuccessContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  formSuccessText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'center',
    width: 60,
  },
  timeSeparator: {
    fontSize: 20,
    marginHorizontal: 8,
    fontWeight: '600',
  },
  submitButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});