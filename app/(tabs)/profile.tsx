import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { User, Settings, Bell, LogOut, Moon, ChevronRight, Shield, Trophy, Clock } from 'lucide-react-native';

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSignOut = async () => {
    try {
      await signOut();
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
      <Header title="Profile" showBackButton={false} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.primaryLight }]}>
            {user?.user_metadata?.avatar_url ? (
              <Image 
                source={{ uri: user.user_metadata.avatar_url }} 
                style={styles.avatar} 
              />
            ) : (
              <User size={40} color={colors.primary} />
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {user?.user_metadata?.name || 'Karting Pilot'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
              {user?.email || 'pilot@kartingleague.com'}
            </Text>
            
            {user?.user_metadata?.role === 'pilot' && (
              <View style={styles.pilotNumberContainer}>
                <View style={[styles.pilotNumber, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.pilotNumberText, { color: colors.white }]}>
                    {user?.user_metadata?.number || '28'}
                  </Text>
                </View>
                <Text style={[styles.pilotTeam, { color: colors.textSecondary }]}>
                  {user?.user_metadata?.team || 'Team Alpha'}
                </Text>
              </View>
            )}
            
            {user?.user_metadata?.role === 'organizer' && (
              <View style={styles.organizerBadge}>
                <Shield size={14} color={colors.white} />
                <Text style={styles.organizerText}>Organizer</Text>
              </View>
            )}
          </View>
        </View>
        
        {user?.user_metadata?.role === 'pilot' && (
          <Card style={styles.statsCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Season Statistics</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                  <Trophy size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.races}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Races</Text>
              </View>
              
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                  <Trophy size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.podiums}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Podiums</Text>
              </View>
              
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                  <Trophy size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.wins}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Wins</Text>
              </View>
              
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                  <Trophy size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.bestPosition}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Best Pos</Text>
              </View>
              
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                  <Clock size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.bestLap}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Best Lap</Text>
              </View>
              
              <View style={styles.statItem}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.primaryLight }]}>
                  <Trophy size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{pilotStats.points}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Points</Text>
              </View>
            </View>
          </Card>
        )}
        
        <Card style={styles.settingsCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
          
          <View style={styles.settingsList}>
            <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
              <View style={styles.settingLeft}>
                <Bell size={20} color={colors.textSecondary} style={styles.settingIcon} />
                <Text style={[styles.settingText, { color: colors.text }]}>Notifications</Text>
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
                <Moon size={20} color={colors.textSecondary} style={styles.settingIcon} />
                <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
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
                <Settings size={20} color={colors.textSecondary} style={styles.settingIcon} />
                <Text style={[styles.settingText, { color: colors.text }]}>Account Settings</Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Card>
        
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: colors.error }]}
          onPress={handleSignOut}
        >
          <LogOut size={20} color={colors.white} style={styles.signOutIcon} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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
});