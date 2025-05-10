import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Card from '@/components/Card';
import { useTheme } from '@/context/ThemeContext';

interface PilotStats {
  totalRaces: number;
  podiums: number;
  wins: number;
  totalPoints: number;
  bestPosition: number;
  polePosition: number;
}

type Props = {
  stats: PilotStats;
};

export default function StatsCard({ stats }: Props) {
  const { colors } = useTheme();

  const statItems = [
    {
      icon: 'flag-checkered',
      label: 'Carreras',
      value: stats.totalRaces,
    },
    {
      icon: 'podium',
      label: 'Podios',
      value: stats.podiums,
    },
    {
      icon: 'trophy',
      label: 'Victorias',
      value: stats.wins,
    },
    {
      icon: 'medal-outline',
      label: 'Puntos',
      value: stats.totalPoints,
    },
    {
      icon: 'numeric-1-circle',
      label: 'Mejor Posición',
      value: stats.bestPosition,
    },
    {
      icon: 'flag-outline',
      label: 'Poles',
      value: stats.polePosition,
    },
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Estadísticas generales</Text>
        <MaterialCommunityIcons name="medal" size={24} color={colors.primary} />
      </View>
      <View style={styles.grid}>
        {statItems.map((item, index) => (
          <View key={index} style={styles.item}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
              <MaterialCommunityIcons name={item.icon as any} size={24} color={colors.primary} />
            </View>
            <Text style={[styles.value, { color: colors.text }]}>{item.value}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{item.label}</Text>
          </View>
        ))}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  item: {
    width: '30%',
    alignItems: 'center',
    marginVertical: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 13,
    textAlign: 'center',
  },
});
