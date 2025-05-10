import React from 'react';
import { View, StyleSheet, Dimensions, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Card from '@/components/Card';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;

type SkeletonLoaderProps = {
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
};

export const SkeletonLoader = ({ style, width, height }: SkeletonLoaderProps) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: colors.card,
          borderRadius: 8,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[colors.card, colors.primaryLight, colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          ...StyleSheet.absoluteFillObject,
          transform: [{ translateX: -width }],
        }}
      />
    </View>
  );
};

export const NextRaceCardSkeleton = () => (
  <Card style={styles.card}>
    <View style={styles.header}>
      <SkeletonLoader width={120} height={24} />
      <SkeletonLoader width={24} height={24} style={{ borderRadius: 12 }} />
    </View>
    <View style={styles.nextRaceContent}>
      <SkeletonLoader width={70} height={70} style={{ borderRadius: 12 }} />
      <View style={styles.raceInfo}>
        <SkeletonLoader width={200} height={20} style={{ marginBottom: 8 }} />
        <SkeletonLoader width={150} height={16} style={{ marginBottom: 6 }} />
        <SkeletonLoader width={180} height={16} />
      </View>
    </View>
  </Card>
);

export const StatsCardSkeleton = () => (
  <Card style={styles.card}>
    <View style={styles.header}>
      <SkeletonLoader width={150} height={24} />
      <SkeletonLoader width={24} height={24} style={{ borderRadius: 12 }} />
    </View>
    <View style={styles.grid}>
      {[...Array(6)].map((_, i) => (
        <View key={i} style={styles.statItem}>
          <SkeletonLoader width={40} height={40} style={{ borderRadius: 20, marginBottom: 8 }} />
          <SkeletonLoader width={30} height={20} style={{ marginBottom: 4 }} />
          <SkeletonLoader width={60} height={16} />
        </View>
      ))}
    </View>
  </Card>
);

export const ChartCardSkeleton = () => (
  <Card style={styles.card}>
    <View style={styles.header}>
      <SkeletonLoader width={140} height={24} />
      <SkeletonLoader width={24} height={24} style={{ borderRadius: 12 }} />
    </View>
    <SkeletonLoader width={screenWidth - 64} height={180} style={{ marginTop: 8 }} />
  </Card>
);

export const ResultsCardSkeleton = () => (
  <Card style={styles.card}>
    <View style={styles.header}>
      <SkeletonLoader width={140} height={24} />
      <SkeletonLoader width={24} height={24} style={{ borderRadius: 12 }} />
    </View>
    <View style={styles.list}>
      {[...Array(5)].map((_, idx) => (
        <View key={idx} style={[styles.resultItem, idx === 4 && styles.lastItem]}>
          <View style={styles.info}>
            <SkeletonLoader width={200} height={20} style={{ marginBottom: 4 }} />
            <SkeletonLoader width={150} height={16} />
          </View>
          <SkeletonLoader width={40} height={30} style={{ borderRadius: 4 }} />
        </View>
      ))}
    </View>
  </Card>
);

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
  nextRaceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  raceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
    marginVertical: 8,
  },
  list: {
    marginTop: 8,
  },
  resultItem: {
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
});
