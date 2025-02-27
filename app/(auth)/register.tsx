import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Users, Hash } from 'lucide-react-native';

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
    } catch(error) {
      console.log(error);
    }
  }
}