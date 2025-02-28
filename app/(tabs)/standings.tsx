import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { Trophy, Users, Calendar } from 'lucide-react-native';
import { supabase, PilotStanding, TeamStanding, Season } from '@/lib/supabase';

export default function StandingsScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('pilots');
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [pilotStandings, setPilotStandings] = useState<PilotStanding[]>([]);
  const [teamStandings, setTeamStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSeasons() {
      try {
        const { data, error } = await supabase
          .from('seasons')
          .select('*')
          .order('start_date', { ascending: false });

        if (error) {
          throw error;
        }

        setSeasons(data || []);
        
        // Set active season as default
        const activeSeason = data?.find(season => season.is_active);
        if (activeSeason) {
          setSelectedSeason(activeSeason.id);
        } else if (data && data.length > 0) {
          setSelectedSeason(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching seasons:', error);
        setError('Error al cargar las temporadas');
      }
    }

    fetchSeasons();
  }, []);

  useEffect(() => {
    async function fetchStandings() {
      if (!selectedSeason) return;
      
      try {
        setLoading(true);
        
        // Fetch pilot standings
        const { data: pilotData, error: pilotError } = await supabase
          .rpc('get_pilot_standings', { season_id: selectedSeason });

        if (pilotError) {
          throw pilotError;
        }

        setPilotStandings(pilotData || []);

        // Fetch team standings
        const { data: teamData, error: teamError } = await supabase
          .rpc('get_team_standings', { season_id: selectedSeason });

        if (teamError) {
          throw teamError;
        }

        setTeamStandings(teamData || []);
      } catch (error) {
        console.error('Error fetching standings:', error);
        setError('Error al cargar las clasificaciones');
      } finally {
        setLoading(false);
      }
    }

    fetchStandings();
  }, [selectedSeason]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Clasificaciones" showBackButton={false} />
      
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
            Pilotos
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
            Equipos
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.seasonSelector}>
        <View style={styles.seasonHeader}>
          <Calendar size={18} color={colors.textSecondary} />
          <Text style={[styles.seasonLabel, { color: colors.textSecondary }]}>Temporada:</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonButtons}>
          {seasons.map((season) => (
            <TouchableOpacity
              key={season.id}
              style={[
                styles.seasonButton,
                selectedSeason === season.id && { ...styles.activeSeason, backgroundColor: colors.primaryLight }
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
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Cargando clasificaciones...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : activeTab === 'pilots' ? (
          <View style={styles.standingsContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.positionHeader, { color: colors.textSecondary }]}>Pos</Text>
              <Text style={[styles.pilotHeader, { color: colors.textSecondary }]}>Piloto</Text>
              <Text style={[styles.teamHeader, { color: colors.textSecondary }]}>Equipo</Text>
              <Text style={[styles.pointsHeader, { color: colors.textSecondary }]}>Pts</Text>
            </View>
            
            {pilotStandings.length > 0 ? (
              pilotStandings.map((pilot) => (
                <Card key={pilot.pilot_id} style={styles.standingCard}>
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
                          {pilot.pilot_number}
                        </Text>
                      </View>
                      <Text style={[styles.pilotName, { color: colors.text }]}>{pilot.pilot_name}</Text>
                    </View>
                    
                    <Text style={[styles.teamName, { color: colors.textSecondary }]}>{pilot.team_name}</Text>
                    
                    <View style={styles.pointsContainer}>
                      <Text style={[styles.points, { color: colors.text }]}>{pilot.total_points}</Text>
                    </View>
                  </View>
                </Card>
              ))
            ) : (
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                No hay datos de clasificación disponibles para esta temporada
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.standingsContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.positionHeader, { color: colors.textSecondary }]}>Pos</Text>
              <Text style={[styles.teamTableHeader, { color: colors.textSecondary }]}>Equipo</Text>
              <Text style={[styles.pointsHeader, { color: colors.textSecondary }]}>Pts</Text>
            </View>
            
            {teamStandings.length > 0 ? (
              teamStandings.map((team) => (
                <Card key={team.team_id} style={styles.standingCard}>
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
                      <Text style={[styles.teamTableName, { color: colors.text }]}>{team.team_name}</Text>
                      <Text style={[styles.teamPilots, { color: colors.textSecondary }]}>{team.pilots_list}</Text>
                    </View>
                    
                    <View style={styles.pointsContainer}>
                      <Text style={[styles.points, { color: colors.text }]}>{team.total_points}</Text>
                    </View>
                  </View>
                </Card>
              ))
            ) : (
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
                No hay datos de clasificación de equipos disponibles para esta temporada
              </Text>
            )}
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
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
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