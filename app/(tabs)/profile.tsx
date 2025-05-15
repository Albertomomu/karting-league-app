import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [pilotData, setPilotData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPilotData() {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch pilot data if user is a pilot
        if (user.user_metadata?.role === 'pilot') {
          const { data, error } = await supabase
            .from('pilots')
            .select(`
              *,
              team:teams(name)
            `)
            .eq('user_id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          setPilotData(data);
        }
      } catch (error) {
        console.error('Error fetching pilot data:', error);
        setError('Error al cargar los datos del piloto');
      } finally {
        setLoading(false);
      }
    }

    fetchPilotData();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const pilotStats = {
    races: 24,
    podiums: 8,
    wins: 3,
    bestPosition: 1,
    bestLap: '1:01.234',
    points: 187,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Perfil" showBackButton={false} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Cargando perfil...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.profileHeader}>
              <View style={[styles.avatarContainer, { backgroundColor: colors.primaryLight }]}>
              {user?.user_metadata?.avatar_url ? (
                <Image
                  source={{ uri: user.user_metadata.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.avatarInitial, { color: colors.white }]}>
                    {(user?.user_metadata?.name || pilotData?.name || 'P')[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              </View>

              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]}>
                  {user?.user_metadata?.name || pilotData?.name || 'Piloto de Karting'}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                  {user?.email || 'piloto@kartingleague.com'}
                </Text>

                {user?.user_metadata?.role === 'pilot' && (
                  <View style={styles.pilotNumberContainer}>
                    <View style={[styles.pilotNumber, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.pilotNumberText, { color: colors.white }]}>
                        {user?.user_metadata?.number || pilotData?.number || '28'}
                      </Text>
                    </View>
                    <Text style={[styles.pilotTeam, { color: colors.textSecondary }]}>
                      {pilotData?.team?.name || user?.user_metadata?.team || 'Equipo Independiente'}
                    </Text>
                  </View>
                )}

                {user?.user_metadata?.role === 'organizer' && (
                  <View style={styles.organizerBadge}>
                    <MaterialCommunityIcons name="shield" size={14} color={colors.white} />
                    <Text style={styles.organizerText}>Organizador</Text>
                  </View>
                )}
              </View>
            </View>

            {user?.user_metadata?.role === 'pilot' && (
              <Card style={styles.statsCard}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Estadísticas de Temporada</Text>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="trophy" size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.races}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Carreras</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="trophy" size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.podiums}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Podios</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="trophy" size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.wins}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Victorias</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="trophy" size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.bestPosition}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mejor Pos</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="clock" size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.bestLap}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mejor Vuelta</Text>
                  </View>

                  <View style={styles.statItem}>
                    <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                      <MaterialCommunityIcons name="trophy" size={20} color={colors.primary} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.points}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Puntos</Text>
                  </View>
                </View>
              </Card>
            )}

            <Card style={styles.settingsCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ajustes</Text>

              <View style={styles.settingsList}>
                <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="bell" size={20} color={colors.textSecondary} style={styles.settingIcon} />
                    <Text style={[styles.settingText, { color: colors.text }]}>Notificaciones</Text>
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={notificationsEnabled ? colors.primary : colors.textSecondary}
                  />
                </View>

                <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="theme-light-dark" size={20} color={colors.textSecondary} style={styles.settingIcon} />
                    <Text style={[styles.settingText, { color: colors.text }]}>Modo Oscuro</Text>
                  </View>
                  <Switch
                    value={isDark}
                    onValueChange={toggleTheme}
                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                    thumbColor={isDark ? colors.primary : colors.textSecondary}
                  />
                </View>

                <TouchableOpacity style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="cog" size={20} color={colors.textSecondary} style={styles.settingIcon} />
                    <Text style={[styles.settingText, { color: colors.text }]}>Ajustes de Cuenta</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </Card>

            <TouchableOpacity
              style={[styles.signOutButton, { backgroundColor: colors.error }]}
              onPress={handleSignOut}
            >
              <MaterialCommunityIcons name="logout" size={20} color={colors.white} style={styles.signOutIcon} />
              <Text style={styles.signOutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </>
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  pilotNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pilotNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  pilotNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  pilotTeam: {
    fontSize: 14,
  },
  organizerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  organizerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  settingsCard: {
    marginBottom: 24,
  },
  settingsList: {

  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  signOutIcon: {
    marginRight: 8,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: 'bold',
  },
});