import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase, Season, Pilot, Team, RaceResult } from '@/lib/supabase';

export default function StandingsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pilots' | 'teams'>('pilots');
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [pilotStandings, setPilotStandings] = useState<any[]>([]);
  const [teamStandings, setTeamStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    async function fetchStandings() {
      if (!selectedSeason) return;

      try {
        setLoading(true);

        // Fetch pilot standings with points
        const { data: pilotData, error: pilotError } = await supabase
          .from('pilot')
          .select(`
          id,
          name,
          number,
          team:team_id(name),
          points:race_result(
            points,
            race(
              season_id
            )
          )
        `)
          .eq('race_result.race.season_id', selectedSeason);

        if (pilotError) throw pilotError;

        // Calculate total points for each pilot
        const processedPilots = pilotData?.map(pilot => ({
          id: pilot.id,
          name: pilot.name,
          number: pilot.number,
          team: pilot.team?.name || 'Sin equipo',
          points: pilot.points?.reduce((sum: number, result: any) => sum + (result.points || 0), 0) || 0
        })) || [];

        // Sort by points and add position
        const sortedPilots = processedPilots
          .sort((a, b) => b.points - a.points)
          .map((pilot, index) => ({
            ...pilot,
            position: index + 1
          }));

        setPilotStandings(sortedPilots);

        // Fetch team standings with points
        const { data: teamData, error: teamError } = await supabase
          .from('team')
          .select(`
          id,
          name,
          pilots:pilot(
            id,
            name,
            number,
            race_result(
              points,
              race(season_id)
            )
          )
        `)
          .eq('pilot.race_result.race.season_id', selectedSeason);


        if (teamError) throw teamError;

        // Calculate total points for each team
        const processedTeams = teamData?.map(team => ({
          id: team.id,
          name: team.name,
          points: team.pilots?.reduce((sum: number, pilot: any) => {
            return sum + (pilot.race_result?.reduce((s: number, r: any) => s + (r.points || 0), 0) || 0);
          }, 0) || 0,
          pilots: team.pilots?.map((p: any) => p.name).join(', ') || ''
        })) || [];

        // Sort by points and add position
        const sortedTeams = processedTeams
          .sort((a, b) => b.points - a.points)
          .map((team, index) => ({
            ...team,
            position: index + 1
          }));

        setTeamStandings(sortedTeams);
      } catch (error) {
        console.error('Error fetching standings:', error);
        setError('Error al cargar las clasificaciones');
      } finally {
        setLoading(false);
      }
    }

    fetchStandings();
  }, [selectedSeason]);

  const renderPilotStandings = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando clasificación de pilotos...
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

    if (pilotStandings.length === 0) {
      return (
        <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
          No hay datos de pilotos para esta temporada
        </Text>
      );
    }

    return (
      <View style={styles.standingsContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { color: colors.textSecondary, width: 50 }]}>Pos</Text>
          <Text style={[styles.headerText, { color: colors.textSecondary, flex: 2 }]}>Piloto</Text>
          <Text style={[styles.headerText, { color: colors.textSecondary, flex: 1 }]}>Equipo</Text>
          <Text style={[styles.headerText, { color: colors.textSecondary, width: 60, textAlign: 'right' }]}>Pts</Text>
        </View>

        {pilotStandings.map((pilot) => (
          <Card key={pilot.id} style={styles.standingCard}>
            <View style={styles.standingRow}>
              <View style={[styles.positionCell, { width: 50 }]}>
                <View
                  style={[
                    styles.positionBadge,
                    pilot.position === 1 && { backgroundColor: '#FFD700' },
                    pilot.position === 2 && { backgroundColor: '#C0C0C0' },
                    pilot.position === 3 && { backgroundColor: '#CD7F32' },
                    pilot.position > 3 && { backgroundColor: colors.card }
                  ]}
                >
                  <Text
                    style={[
                      styles.positionText,
                      pilot.position <= 3 && { color: '#000' },
                      pilot.position > 3 && { color: colors.text }
                    ]}
                  >
                    {pilot.position}
                  </Text>
                </View>
              </View>
              <View style={[styles.pilotCell, { flex: 1 }]}>
                <Text style={[styles.pilotName, { color: colors.text }]} numberOfLines={1}>
                  {pilot.name}
                </Text>
              </View>

              <Text
                style={[styles.teamCell, { flex: 1, color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {pilot.team}
              </Text>

              <View style={[styles.pointsCell, { width: 60 }]}>
                <Text style={[styles.pointsText, { color: colors.text }]}>
                  {pilot.points}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    );
  };

  const renderTeamStandings = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Cargando clasificación de equipos...
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

    if (teamStandings.length === 0) {
      return (
        <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
          No hay datos de equipos para esta temporada
        </Text>
      );
    }

    return (
      <View style={styles.standingsContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, { color: colors.textSecondary, width: 50 }]}>Pos</Text>
          <Text style={[styles.headerText, { color: colors.textSecondary, flex: 3 }]}>Equipo</Text>
          <Text style={[styles.headerText, { color: colors.textSecondary, width: 60, textAlign: 'right' }]}>Pts</Text>
        </View>

        {teamStandings.map((team) => (
          <Card key={team.id} style={styles.standingCard}>
            <View style={styles.standingRow}>
              <View style={[styles.positionCell, { width: 50 }]}>
                <View
                  style={[
                    styles.positionBadge,
                    team.position === 1 && { backgroundColor: '#FFD700' },
                    team.position === 2 && { backgroundColor: '#C0C0C0' },
                    team.position === 3 && { backgroundColor: '#CD7F32' },
                    team.position > 3 && { backgroundColor: colors.card }
                  ]}
                >
                  <Text
                    style={[
                      styles.positionText,
                      team.position <= 3 && { color: '#000' },
                      team.position > 3 && { color: colors.text }
                    ]}
                  >
                    {team.position}
                  </Text>
                </View>
              </View>

              <View style={[styles.teamInfoCell, { flex: 3 }]}>
                <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                  {team.name}
                </Text>
                <Text style={[styles.teamPilots, { color: colors.textSecondary }]} numberOfLines={1}>
                  {team.pilots}
                </Text>
              </View>

              <View style={[styles.pointsCell, { width: 60 }]}>
                <Text style={[styles.pointsText, { color: colors.text }]}>
                  {team.points}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Clasificaciones" showBackButton={false} />

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'pilots' && { borderBottomColor: colors.primary }
          ]}
          onPress={() => setActiveTab('pilots')}
        >
          <MaterialCommunityIcons name="trophy" size={24} color={activeTab === 'pilots' ? colors.primary : colors.textSecondary} />
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
            styles.tabButton,
            activeTab === 'teams' && { borderBottomColor: colors.primary }
          ]}
          onPress={() => setActiveTab('teams')}
        >
          <MaterialCommunityIcons name="account-group" size={24} color={activeTab === 'teams' ? colors.primary : colors.textSecondary} />
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
        {activeTab === 'pilots' ? renderPilotStandings() : renderTeamStandings()}
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
    marginTop: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 16,
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
  standingsContainer: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  headerText: {
    fontWeight: '600',
    fontSize: 14,
  },
  standingCard: {
    marginBottom: 8,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  positionCell: {
    alignItems: 'left',
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
  pilotCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
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
    flex: 1,
    fontWeight: '500',
    fontSize: 14,
  },
  teamCell: {
    fontSize: 14,
    paddingRight: 8,
  },
  teamInfoCell: {
    paddingRight: 8,
  },
  teamName: {
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 2,
  },
  teamPilots: {
    fontSize: 12,
  },
  pointsCell: {
    alignItems: 'flex-end',
  },
  pointsText: {
    fontWeight: '700',
    fontSize: 16,
  },
});