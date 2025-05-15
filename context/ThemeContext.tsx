import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';

// Define theme colors
const lightColors = {
  primary: '#2563EB',         // Azul deportivo pero elegante
  primaryLight: '#DBEAFE',    // Azul pastel suave
  secondary: '#4F46E5',       // Azul profundo con carácter
  background: '#F9FAFB',      // Gris muy claro para fondo
  card: '#FFFFFF',            // Blanco limpio
  text: '#1F2937',            // Gris oscuro
  textSecondary: '#6B7280',   // Gris medio
  border: '#E5E7EB',          // Gris claro para bordes
  shadow: '#00000010',        // Sombra muy sutil
  success: '#10B981',         // Verde suave
  error: '#60A5FA',           // Azul claro en lugar de rojo
  errorLight: '#E0F2FE',      // Azul pastel para errores
  warning: '#FCD34D',         // Amarillo pastel
  white: '#FFFFFF',
  info: '#38BDF8',            // Azul cielo para info
};

const darkColors = {
  primary: '#3B82F6',         // Azul brillante deportivo
  primaryLight: '#1E3A8A',    // Azul profundo
  secondary: '#6366F1',       // Indigo sobrio
  background: '#0F172A',      // Azul oscuro profundo (casi negro)
  card: '#1E293B',            // Gris azulado para tarjetas
  text: '#F8FAFC',            // Casi blanco
  textSecondary: '#94A3B8',   // Gris claro
  border: '#334155',          // Gris oscuro para bordes
  shadow: '#00000040',        // Sombra sutil
  success: '#34D399',
  error: '#60A5FA',           // Azul claro
  errorLight: '#1E40AF',      // Azul profundo
  warning: '#FBBF24',
  white: '#FFFFFF',
  info: '#38BDF8',
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