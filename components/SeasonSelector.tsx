import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Season } from '@/lib/supabase';

type Props = {
  seasons: Season[];
  selectedSeason: string | null;
  onSelect: (seasonId: string) => void;
};

export default function SeasonSelector({ seasons, selectedSeason, onSelect }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="calendar" size={24} color={colors.textSecondary} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {seasons.map((season) => (
          <TouchableOpacity
            key={season.id}
            style={[
              styles.button,
              selectedSeason === season.id && { backgroundColor: colors.primaryLight },
            ]}
            onPress={() => onSelect(season.id)}
          >
            <Text
              style={[
                styles.text,
                {
                  color:
                    selectedSeason === season.id ? colors.primary : colors.textSecondary,
                },
              ]}
            >
              {season.name}
            </Text>
            {season.is_active && (
              <View style={[styles.activeBadge, { backgroundColor: colors.primary }]} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingLeft: 10,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: '500',
    fontSize: 14,
  },
  activeBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
});