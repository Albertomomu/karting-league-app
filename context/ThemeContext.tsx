import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';

// Define theme colors
const lightColors = {
  primary: '#6366F1', // Indigo
  primaryLight: '#EEF2FF',
  secondary: '#8B5CF6', // Violet
  background: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  shadow: '#000000',
  success: '#10B981',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  white: '#FFFFFF',
  info: '#3B82F6', // Blue
};

const darkColors = {
  primary: '#818CF8', // Lighter Indigo for dark mode
  primaryLight: '#312E81',
  secondary: '#A78BFA', // Lighter Violet for dark mode
  background: '#111827',
  card: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  border: '#374151',
  shadow: '#000000',
  success: '#34D399',
  error: '#F87171',
  errorLight: '#7F1D1D',
  warning: '#FBBF24',
  white: '#FFFFFF',
  info: '#60A5FA', // Light Blue
};

type ThemeColors = typeof lightColors;

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');

  useEffect(() => {
    setIsDark(colorScheme === 'dark');
  }, [colorScheme]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}