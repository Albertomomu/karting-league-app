import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pilotNumber, setPilotNumber] = useState('');
  const [team, setTeam] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userType, setUserType] = useState('pilot'); // 'pilot' or 'organizer'

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (userType === 'pilot' && !pilotNumber) {
      setError('Pilot number is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userData = {
        name,
        role: userType,
        ...(userType === 'pilot' && {
          number: pilotNumber,
          team: team || 'Independent'
        })
      };

      await signUp(email, password, userData);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <ScrollView>
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        leftIcon={<MaterialCommunityIcons name="email-outline" size={24} color={colors.textSecondary} />}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        leftIcon={<MaterialCommunityIcons name="lock-outline" size={24} color={colors.textSecondary} />}
        rightIcon={<MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={24} color={colors.textSecondary} />}
      />
      <TextInput
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showConfirmPassword}
        leftIcon={<MaterialCommunityIcons name="lock-outline" size={24} color={colors.textSecondary} />}
        rightIcon={<MaterialCommunityIcons name={showConfirmPassword ? "eye-off" : "eye"} size={24} color={colors.textSecondary} />}
      />
      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
        leftIcon={<MaterialCommunityIcons name="account" size={24} color={colors.textSecondary} />}
      />
      <TextInput
        placeholder="Pilot Number"
        value={pilotNumber}
        onChangeText={setPilotNumber}
        leftIcon={<MaterialCommunityIcons name="pound" size={24} color={colors.textSecondary} />}
      />
      <TextInput
        placeholder="Team"
        value={team}
        onChangeText={setTeam}
        leftIcon={<MaterialCommunityIcons name="account-group" size={24} color={colors.textSecondary} />}
      />
    </ScrollView>
  );
}