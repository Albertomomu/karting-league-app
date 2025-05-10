import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Card from '@/components/Card';
import { useTheme } from '@/context/ThemeContext';
import { RaceResult, Race, Session } from '@/lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type ResultItem = RaceResult & {
  race: Race;
  session: Session;
};

type Props = {
  results: ResultItem[];
  onResultPress: (raceId: string) => void;
};

export default function LastResultsCard({ results, onResultPress }: Props) {
  const { colors } = useTheme();

  const filteredResults = results.filter(
    (result) =>
      result.session &&
      !/clasificaci[oó]n|qualifying/i.test(result.session.name)
  );

  const formatRaceDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d 'de' MMMM, yyyy", { locale: es });
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Últimos resultados</Text>
        <MaterialCommunityIcons name="history" size={24} color={colors.primary} />
      </View>
      <View style={styles.list}>
        {filteredResults.slice(0, 5).map((result, idx) => (
          <TouchableOpacity
            key={result.id}
            style={[styles.item, idx === filteredResults.length - 1 && styles.lastItem]}
            onPress={() => onResultPress(result.race.id)}
          >
            <View style={styles.info}>
              <Text style={[styles.raceName, { color: colors.text }]} numberOfLines={1}>
                {result.race?.name}
              </Text>
              <Text style={[styles.date, { color: colors.textSecondary }]}> 
                {formatRaceDate(result.race?.date)}
              </Text>
            </View>
            <View style={styles.positionContainer}>
              <Text style={[styles.position, { color: colors.primary }]}>
                {result.race_position}
              </Text>
              <MaterialCommunityIcons name="flag-checkered" size={20} color={colors.primary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 0,
    paddingBottom: 4,
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
  list: {
    marginTop: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    justifyContent: 'space-between',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  info: {
    flex: 1,
  },
  raceName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 13,
    marginTop: 2,
  },
  positionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  position: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});