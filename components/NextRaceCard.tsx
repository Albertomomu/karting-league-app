import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Card from '@/components/Card';
import { Race } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Props = {
  race: Race & { circuit?: { name?: string; image_url?: string } };
};

export default function NextRaceCard({ race }: Props) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Próxima carrera</Text>
        <MaterialCommunityIcons name="calendar" size={24} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Image
          source={{
            uri:
              race?.circuit?.image_url ||
              'https://images.unsplash.com/photo-1630925546089-7ac0e8028e9f?q=80&w=2070&auto=format&fit=crop',
          }}
          style={styles.image}
        />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>{race.name}</Text>
          <Text style={[styles.circuit, { color: colors.textSecondary }]}>Circuito: {race?.circuit?.name}</Text>
          <Text style={[styles.date, { color: colors.primary }]}>Fecha: {format(new Date(race.date), "EEEE d 'de' MMMM", { locale: es }).replace(/^./, l => l.toUpperCase())}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  circuit: {
    fontSize: 14,
    marginTop: 2,
  },
  date: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: 'bold',
  },
});
