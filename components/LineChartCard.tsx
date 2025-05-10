import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '@/context/ThemeContext';
import Card from '@/components/Card';

const screenWidth = Dimensions.get('window').width;

interface Props {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  chartData: {
    labels: string[];
    datasets: { data: number[] }[];
  };
}

export default function LineChartCard({ title, icon, chartData }: Props) {
  const { colors } = useTheme();

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(${parseInt(colors.primary.slice(1, 3), 16)}, ${parseInt(colors.primary.slice(3, 5), 16)}, ${parseInt(colors.primary.slice(5, 7), 16)}, ${opacity})`,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
    propsForLabels: {
      fontSize: 10,
    },
    propsForVerticalLabels: {
      fontSize: 10,
      rotation: 0,
    },
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <LineChart
            data={chartData}
            width={Math.max(screenWidth, chartData.labels.length * 60)}
            height={180}
            chartConfig={chartConfig}
            bezier
            style={{ marginLeft: -16, marginVertical: 8 }}
            fromZero
            yAxisLabel=""
            yLabelsOffset={8}
            withVerticalLines={false}
            withHorizontalLines={true}
            segments={5}
            formatYLabel={y => `${y}`}
          />
        </View>
      </ScrollView>
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
});
