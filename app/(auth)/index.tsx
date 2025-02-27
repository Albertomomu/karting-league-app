import { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoBackground, { backgroundColor: colors.primaryLight }]}>
            <Image 
              source={{ uri: 'https://kartingleague.es/wp-content/uploads/2023/07/Logo-tuned-karting-league-on-transparent-1.png' }} 
              style={styles.logoImage}
            />
          </View>
        </View>
        
        <Text style={[styles.title, { color: colors.text }]}>Karting League</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          The ultimate companion for karting enthusiasts
        </Text>
        
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.featureIconText, { color: colors.primary }]}>🏁</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Live Results</Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                Access real-time race results and standings
              </Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.featureIconText, { color: colors.primary }]}>⏱️</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Lap Times</Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                Track your performance with detailed lap time analysis
              </Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.featureIconText, { color: colors.primary }]}>🏆</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Championships</Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                Follow the season standings for pilots and teams
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { borderColor: colors.primary }]}
          onPress={() => router.push('/register')}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText, { color: colors.primary }]}>
            Create Account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  features: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureIconText: {
    fontSize: 24,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttons: {
    width: '100%',
    marginBottom: 24,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  secondaryButtonText: {
    color: '#000000',
  },
});