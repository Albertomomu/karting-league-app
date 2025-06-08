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
  const [pilotData, setPilotData] = useState<any>(null);
  const [teamHistory, setTeamHistory] = useState<any[]>([]);
  const [licensePoints, setLicensePoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      setLoading(true);
      try {
        // 1. Obtener datos del piloto
        const { data: pilot, error: pilotError } = await supabase
          .from('pilot')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (pilotError && pilotError.code !== 'PGRST116') throw pilotError;
        setPilotData(pilot);

        // 2. Obtener temporada activa
        const { data: seasons, error: seasonError } = await supabase
          .from('season')
          .select('id, name')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (seasonError) throw seasonError;
        const activeSeason = seasons;

        // 3. Obtener historial de equipos del piloto
        let history: any[] = [];
        let currentLicensePoints: number | null = null;
        if (pilot?.id) {
          const { data: teamSeasons, error: teamSeasonError } = await supabase
            .from('pilot_team_season')
            .select(`
              is_wildkart,
              license_points,
              season:season_id(id, name),
              team:team_id(id, name, logo_url)
            `)
            .eq('pilot_id', pilot.id)
            .order('season_id', { ascending: false });
          if (teamSeasonError) throw teamSeasonError;
          history = (teamSeasons ?? []).map((row: any) => ({
            is_wildkart: row.is_wildkart,
            license_points: row.license_points,
            season: Array.isArray(row.season) ? row.season[0] : row.season,
            team: Array.isArray(row.team) ? row.team[0] : row.team,
          })).filter((row: any) => row.team && row.season);

          // 4. License points de la temporada activa
          if (activeSeason) {
            const current = history.find((row: any) => row.season.id === activeSeason.id);
            currentLicensePoints = current ? current.license_points : null;
          }
        }
        setTeamHistory(history);
        setLicensePoints(currentLicensePoints);
      } catch (err) {
        setError('Error al cargar los datos del perfil');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)');
    } catch (error) {
      console.error('Error signing out:', error);
    }
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
                {pilotData.avatar_url ? (
                  <Image
                    source={{ uri: pilotData.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.avatarInitial, { color: colors.white }]}>
                      {(pilotData?.name || 'P')[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]}>
                  {pilotData?.name || 'Piloto de Karting'}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                  {user?.email || 'piloto@kartingleague.com'}
                </Text>
                {pilotData.role === 'admin' && (
                  <View style={styles.organizerBadge}>
                    <MaterialCommunityIcons name="shield" size={14} color={colors.white} />
                    <Text style={styles.organizerText}>Organizador</Text>
                  </View>
                )}
              </View>
            </View>

            {/* License Points de la temporada activa */}
            <Card style={styles.statsCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Puntos de Licencia</Text>
              <Text style={{ color: colors.primary, fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>
                {licensePoints !== null ? licensePoints : '—'}
              </Text>
            </Card>

            {/* Historial de equipos */}
            <Card style={styles.statsCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Historial de Equipos</Text>
              {teamHistory.length === 0 ? (
                <Text style={{ color: colors.textSecondary }}>No hay historial de equipos.</Text>
              ) : (
                teamHistory.map((row, idx) => (
                  <View key={row.season.id + '-' + row.team.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    {row.team.logo_url ? (
                      <Image source={{ uri: row.team.logo_url }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }} />
                    ) : (
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, marginRight: 8, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{row.team.name[0]}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={{ color: colors.text, fontWeight: 'bold' }}>{row.team.name}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {row.season.name}{row.is_wildkart ? ' (Wildkart)' : ''}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </Card>

            <Card style={styles.settingsCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ajustes</Text>
              <View style={styles.settingsList}>
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
  container: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  loadingContainer: { padding: 20, alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 24 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  profileEmail: { fontSize: 14, marginBottom: 8 },
  pilotNumberContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  pilotNumber: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  pilotNumberText: { fontSize: 16, fontWeight: '700' },
  pilotTeam: { fontSize: 14 },
  organizerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, alignSelf: 'flex-start' },
  organizerText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  statsCard: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  settingsCard: { marginBottom: 24 },
  settingsList: {},
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  settingIcon: { marginRight: 12 },
  settingText: { fontSize: 16 },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, marginBottom: 24 },
  signOutIcon: { marginRight: 8 },
  signOutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  avatarFallback: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 32, fontWeight: 'bold' },
});
