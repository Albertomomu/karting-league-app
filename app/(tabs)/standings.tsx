import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { Trophy, Users, Calendar } from 'lucide-react-native';

export default function StandingsScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('pilots');
  const [season, setSeason] = useState('2025');

  const pilotStandings = [
    { id: 1, position: 1, number: '28', name: 'Carlos Rodríguez', points: 187, team: 'Team Alpha' },
    { id: 2, position: 2, number: '14', name: 'Laura Martínez', points: 172, team: 'Team Beta' },
    { id: 3, position: 3, number: '07', name: 'Miguel Sánchez', points: 156, team: 'Team Gamma' },
    { id: 4, position: 4, number: '42', name: 'Ana López', points: 143, team: 'Team Delta' },
    { id: 5, position: 5, number: '19', name: 'Javier García', points: 128, team: 'Team Alpha' },
    { id: 6, position: 6, number: '33', name: 'Elena Pérez', points: 112, team: 'Team Beta' },
    { id: 7, position: 7, number: '55', name: 'David Fernández', points: 98, team: 'Team Gamma' },
    { id: 8, position: 8, number: '21', name: 'Sofía Ruiz', points: 87, team: 'Team Delta' },
  ];

  const teamStandings = [
    { id: 1, position: 1, name: 'Team Alpha', points: 315, pilots: 'C. Rodríguez, J. García' },
    { id: 2, position: 2, name: 'Team Beta', points: 284, pilots: 'L. Martínez, E. Pérez' },
    { id: 3, position: 3, name: 'Team Gamma', points: 254, pilots: 'M. Sánchez, D. Fernández' },
    { id: 4, position: 4, name: 'Team Delta', points: 230, pilots: 'A. López, S. Ruiz' },
  ];

  const seasons = ['2023', '2024', '2025'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Standings" showBackButton={false} />
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'pilots' && { ...styles.activeTab, borderColor: colors.primary }
          ]}
          onPress={() => setActiveTab('pilots')}
        >
          <Trophy size={20} color={activeTab === 'pilots' ? colors.primary : colors.textSecondary} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'pilots' ? colors.primary : colors.textSecondary }
            ]}
          >
            Pilots
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'teams' && { ...styles.activeTab, borderColor: colors.primary }
          ]}
          onPress={() => setActiveTab('teams')}
        >
          <Users size={20} color={activeTab === 'teams' ? colors.primary : colors.textSecondary} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'teams' ? colors.primary : colors.textSecondary }
            ]}
          >
            Teams
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.seasonSelector}>
        <View style={styles.seasonHeader}>
          <Calendar size={18} color={colors.textSecondary} />
          <Text style={[styles.seasonLabel, { color: colors.textSecondary }]}>Season:</Text>
        </View>
        <View style={styles.seasonButtons}>
          {seasons.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.seasonButton,
                season === s && { ...styles.activeSeason, backgroundColor: colors.primaryLight }
              ]}
              onPress={() => setSeason(s)}
            >
              <Text
                style={[
                  styles.seasonButtonText,
                  { color: season === s ? colors.primary : colors.textSecondary }
                ]}
              >
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'pilots' ? (
          <View style={styles.standingsContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.positionHeader, { color: colors.textSecondary }]}>Pos</Text>
              <Text style={[styles.pilotHeader, { color: colors.textSecondary }]}>Pilot</Text>
              <Text style={[styles.teamHeader, { color: colors.textSecondary }]}>Team</Text>
              <Text style={[styles.pointsHeader, { color: colors.textSecondary }]}>Pts</Text>
            </View>
            
            {pilotStandings.map((pilot) => (
              <Card key={pilot.id} style={styles.standingCard}>
                <View style={styles.standingRow}>
                  <View style={styles.positionContainer}>
                    <View 
                      style={[
                        styles.positionBadge, 
                        pilot.position === 1 ? { backgroundColor: '#FFD700' } :
                        pilot.position === 2 ? { backgroundColor: '#C0C0C0' } :
                        pilot.position === 3 ? { backgroundColor: '#CD7F32' } :
                        { backgroundColor: colors.card }
                      ]}
                    >
                      <Text style={[styles.positionText, { color: pilot.position <= 3 ? '#000' : colors.text }]}>
                        {pilot.position}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.pilotContainer}>
                    <View style={[styles.pilotNumber, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.pilotNumberText, { color: colors.white }]}>
                        {pilot.number}
                      </Text>
                    </View>
                    <Text style={[styles.pilotName, { color: colors.text }]}>{pilot.name}</Text>
                  </View>
                  
                  <Text style={[styles.teamName, { color: colors.textSecondary }]}>{pilot.team}</Text>
                  
                  <View style={styles.pointsContainer}>
                    <Text style={[styles.points, { color: colors.text }]}>{pilot.points}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <View style={styles.standingsContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.positionHeader, { color: colors.textSecondary }]}>Pos</Text>
              <Text style={[styles.teamTableHeader, { color: colors.textSecondary }]}>Team</Text>
              <Text style={[styles.pointsHeader, { color: colors.textSecondary }]}>Pts</Text>
            </View>
            
            {teamStandings.map((team) => (
              <Card key={team.id} style={styles.standingCard}>
                <View style={styles.standingRow}>
                  <View style={styles.positionContainer}>
                    <View 
                      style={[
                        styles.positionBadge, 
                        team.position === 1 ? { backgroundColor: '#FFD700' } :
                        team.position === 2 ? { backgroundColor: '#C0C0C0' } :
                        team.position === 3 ? { backgroundColor: '#CD7F32' } :
                        { backgroundColor: colors.card }
                      ]}
                    >
                      <Text style={[styles.positionText, { color: team.position <= 3 ? '#000' : colors.text }]}>
                        {team.position}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.teamInfoContainer}>
                    <Text style={[styles.teamTableName, { color: colors.text }]}>{team.name}</Text>
                    <Text style={[styles.teamPilots, { color: colors.textSecondary }]}>{team.pilots}</Text>
                  </View>
                  
                  <View style={styles.pointsContainer}>
                    <Text style={[styles.points, { color: colors.text }]}>{team.points}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
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
  seasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seasonLabel: {
    marginLeft: 6,
    fontWeight: '500',
  },
  seasonButtons: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  seasonButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  activeSeason: {
    borderWidth: 0,
  },
  seasonButtonText: {
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  standingsContainer: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  positionHeader: {
    width: 50,
    fontSize: 14,
    fontWeight: '500',
  },
  pilotHeader: {
    flex: 2,
    fontSize: 14,
    fontWeight: '500',
  },
  teamHeader: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  teamTableHeader: {
    flex: 3,
    fontSize: 14,
    fontWeight: '500',
  },
  pointsHeader: {
    width: 50,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  standingCard: {
    marginBottom: 8,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  positionContainer: {
    width: 50,
    alignItems: 'center',
  },
  positionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    fontWeight: '700',
    fontSize: 14,
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
  teamName: {
    flex: 1,
    fontSize: 14,
  },
  teamInfoContainer: {
    flex: 3,
  },
  teamTableName: {
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 2,
  },
  teamPilots: {
    fontSize: 12,
  },
  pointsContainer: {
    width: 50,
    alignItems: 'flex-end',
  },
  points: {
    fontWeight: '700',
    fontSize: 16,
  },
});