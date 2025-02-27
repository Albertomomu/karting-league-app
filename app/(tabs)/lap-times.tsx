import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { Clock, ChevronDown, Filter, Plus, Check } from 'lucide-react-native';

export default function LapTimesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('view');
  const [selectedCircuit, setSelectedCircuit] = useState('All Circuits');
  const [selectedSession, setSelectedSession] = useState('All Sessions');
  const [showCircuitDropdown, setShowCircuitDropdown] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  
  // Form state for adding lap times (for organizers)
  const [pilotNumber, setPilotNumber] = useState('');
  const [lapNumber, setLapNumber] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [milliseconds, setMilliseconds] = useState('');
  const [formSession, setFormSession] = useState('Race 1');
  const [showFormSessionDropdown, setShowFormSessionDropdown] = useState(false);

  const circuits = ['All Circuits', 'Karting Valencia', 'Circuit de la Ribera', 'Kartodromo de Cheste', 'Karting Riba-roja'];
  const sessions = ['All Sessions', 'Practice', 'Qualifying', 'Race 1', 'Race 2'];
  const formSessions = ['Practice', 'Qualifying', 'Race 1', 'Race 2'];

  const lapTimes = [
    { id: 1, pilot: 'Carlos Rodríguez', number: '28', lap: 5, time: '1:02.345', improvement: '-0.123', circuit: 'Karting Valencia', session: 'Qualifying' },
    { id: 2, pilot: 'Laura Martínez', number: '14', lap: 3, time: '1:03.567', improvement: '-0.089', circuit: 'Karting Valencia', session: 'Qualifying' },
    { id: 3, pilot: 'Miguel Sánchez', number: '07', lap: 7, time: '1:02.789', improvement: '-0.234', circuit: 'Karting Valencia', session: 'Qualifying' },
    { id: 4, pilot: 'Carlos Rodríguez', number: '28', lap: 2, time: '1:04.123', improvement: '-0.567', circuit: 'Karting Valencia', session: 'Race 1' },
    { id: 5, pilot: 'Laura Martínez', number: '14', lap: 4, time: '1:03.890', improvement: '-0.102', circuit: 'Karting Valencia', session: 'Race 1' },
    { id: 6, pilot: 'Miguel Sánchez', number: '07', lap: 6, time: '1:03.456', improvement: '-0.178', circuit: 'Karting Valencia', session: 'Race 1' },
    { id: 7, pilot: 'Carlos Rodríguez', number: '28', lap: 3, time: '1:01.987', improvement: '-0.358', circuit: 'Circuit de la Ribera', session: 'Practice' },
    { id: 8, pilot: 'Laura Martínez', number: '14', lap: 5, time: '1:02.345', improvement: '-0.123', circuit: 'Circuit de la Ribera', session: 'Practice' },
  ];

  const filteredLapTimes = lapTimes.filter(lap => {
    const circuitMatch = selectedCircuit === 'All Circuits' || lap.circuit === selectedCircuit;
    const sessionMatch = selectedSession === 'All Sessions' || lap.session === selectedSession;
    return circuitMatch && sessionMatch;
  });

  const handleAddLapTime = () => {
    // Here you would normally submit to the database
    // For now, just reset the form
    setPilotNumber('');
    setLapNumber('');
    setMinutes('');
    setSeconds('');
    setMilliseconds('');
    setFormSession('Race 1');
    
    // Show success message or feedback
    alert('Lap time added successfully!');
  };

  const isOrganizer = user?.user_metadata?.role === 'organizer';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Lap Times" showBackButton={false} />
      
      {isOrganizer && (
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'view' && { ...styles.activeTab, borderColor: colors.primary }
            ]}
            onPress={() => setActiveTab('view')}
          >
            <Clock size={20} color={activeTab === 'view' ? colors.primary : colors.textSecondary} />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'view' ? colors.primary : colors.textSecondary }
              ]}
            >
              View Times
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'add' && { ...styles.activeTab, borderColor: colors.primary }
            ]}
            onPress={() => setActiveTab('add')}
          >
            <Plus size={20} color={activeTab === 'add' ? colors.primary : colors.textSecondary} />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'add' ? colors.primary : colors.textSecondary }
              ]}
            >
              Add Times
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'view' ? (
        <>
          <View style={styles.filtersContainer}>
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                <Filter size={16} color={colors.textSecondary} style={styles.filterIcon} /> Filters:
              </Text>
              
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[styles.dropdown, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowCircuitDropdown(!showCircuitDropdown);
                    setShowSessionDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownText, { color: colors.text }]}>{selectedCircuit}</Text>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                
                {showCircuitDropdown && (
                  <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {circuits.map((circuit) => (
                      <TouchableOpacity
                        key={circuit}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedCircuit(circuit);
                          setShowCircuitDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text }]}>{circuit}</Text>
                        {selectedCircuit === circuit && <Check size={16} color={colors.primary} />}
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
                  <Text style={[styles.dropdownText, { color: colors.text }]}>{selectedSession}</Text>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                
                {showSessionDropdown && (
                  <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {sessions.map((session) => (
                      <TouchableOpacity
                        key={session}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedSession(session);
                          setShowSessionDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text }]}>{session}</Text>
                        {selectedSession === session && <Check size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.lapTimesContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.pilotHeader, { color: colors.textSecondary }]}>Pilot</Text>
                <Text style={[styles.lapHeader, { color: colors.textSecondary }]}>Lap</Text>
                <Text style={[styles.timeHeader, { color: colors.textSecondary }]}>Time</Text>
                <Text style={[styles.improvementHeader, { color: colors.textSecondary }]}>Imp.</Text>
              </View>
              
              {filteredLapTimes.length > 0 ? (
                filteredLapTimes.map((lap) => (
                  <Card key={lap.id} style={styles.lapTimeCard}>
                    <View style={styles.lapTimeRow}>
                      <View style={styles.pilotContainer}>
                        <View style={[styles.pilotNumber, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.pilotNumberText, { color: colors.white }]}>
                            {lap.number}
                          </Text>
                        </View>
                        <Text style={[styles.pilotName, { color: colors.text }]}>{lap.pilot}</Text>
                      </View>
                      
                      <Text style={[styles.lapNumber, { color: colors.text }]}>{lap.lap}</Text>
                      
                      <Text style={[styles.lapTime, { color: colors.text }]}>{lap.time}</Text>
                      
                      <Text style={[styles.improvement, { color: colors.success }]}>
                        {lap.improvement}
                      </Text>
                    </View>
                    
                    <View style={styles.lapTimeFooter}>
                      <Text style={[styles.sessionInfo, { color: colors.textSecondary }]}>
                        {lap.circuit} • {lap.session}
                      </Text>
                    </View>
                  </Card>
                ))
              ) : (
                <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                  No lap times found for the selected filters
                </Text>
              )}
            </View>
          </ScrollView>
        </>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Card style={styles.formCard}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Add New Lap Time</Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Pilot Number</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="Enter pilot number"
                placeholderTextColor={colors.textSecondary}
                value={pilotNumber}
                onChangeText={setPilotNumber}
                keyboardType="number-pad"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Lap Number</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="Enter lap number"
                placeholderTextColor={colors.textSecondary}
                value={lapNumber}
                onChangeText={setLapNumber}
                keyboardType="number-pad"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Lap Time</Text>
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
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Session</Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[styles.dropdown, { borderColor: colors.border }]}
                  onPress={() => setShowFormSessionDropdown(!showFormSessionDropdown)}
                >
                  <Text style={[styles.dropdownText, { color: colors.text }]}>{formSession}</Text>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                
                {showFormSessionDropdown && (
                  <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {formSessions.map((session) => (
                      <TouchableOpacity
                        key={session}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormSession(session);
                          setShowFormSessionDropdown(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.text }]}>{session}</Text>
                        {formSession === session && <Check size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
            
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleAddLapTime}
            >
              <Text style={[styles.submitButtonText, { color: colors.white }]}>Add Lap Time</Text>
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