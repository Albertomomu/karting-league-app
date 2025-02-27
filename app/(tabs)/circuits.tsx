import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Header from '@/components/Header';
import Card from '@/components/Card';
import { MapPin, Info, ChevronRight } from 'lucide-react-native';

export default function CircuitsScreen() {
  const { colors } = useTheme();
  const [selectedCircuit, setSelectedCircuit] = useState(null);

  const circuits = [
    {
      id: 1,
      name: 'Karting Valencia',
      location: 'Valencia, Spain',
      length: '1.2 km',
      turns: 12,
      recordLap: '1:02.345',
      recordHolder: 'Carlos Rodríguez',
      description: 'A technical circuit with a mix of fast straights and challenging corners. Perfect for testing driver skills.',
      image: 'https://images.unsplash.com/photo-1630925546089-7ac0e8028e9f?q=80&w=2070&auto=format&fit=crop'
    },
    {
      id: 2,
      name: 'Circuit de la Ribera',
      location: 'Alzira, Valencia',
      length: '0.9 km',
      turns: 8,
      recordLap: '0:58.123',
      recordHolder: 'Laura Martínez',
      description: 'A fast-paced circuit with flowing corners and a long main straight. Favors drivers with good throttle control.',
      image: 'https://images.unsplash.com/photo-1580234811497-9df7fd2f357e?q=80&w=2067&auto=format&fit=crop'
    },
    {
      id: 3,
      name: 'Kartodromo de Cheste',
      location: 'Cheste, Valencia',
      length: '1.5 km',
      turns: 15,
      recordLap: '1:12.789',
      recordHolder: 'Miguel Sánchez',
      description: 'Located near the Ricardo Tormo Circuit, this challenging track features elevation changes and technical sections.',
      image: 'https://images.unsplash.com/photo-1623274545361-ebf7e5eb6799?q=80&w=1974&auto=format&fit=crop'
    },
    {
      id: 4,
      name: 'Karting Riba-roja',
      location: 'Riba-roja de Túria, Valencia',
      length: '1.1 km',
      turns: 10,
      recordLap: '1:05.432',
      recordHolder: 'Ana López',
      description: 'A balanced circuit with a mix of technical sections and fast straights. Good overtaking opportunities.',
      image: 'https://images.unsplash.com/photo-1655108723418-484a0c2a2301?q=80&w=1974&auto=format&fit=crop'
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Circuits" showBackButton={false} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Valencia Circuits</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Explore the karting circuits in the Valencia region
        </Text>
        
        {circuits.map((circuit) => (
          <TouchableOpacity
            key={circuit.id}
            onPress={() => setSelectedCircuit(selectedCircuit === circuit.id ? null : circuit.id)}
          >
            <Card style={styles.circuitCard}>
              <Image source={{ uri: circuit.image }} style={styles.circuitImage} />
              
              <View style={styles.circuitInfo}>
                <View style={styles.circuitHeader}>
                  <Text style={[styles.circuitName, { color: colors.text }]}>{circuit.name}</Text>
                  <ChevronRight 
                    size={20} 
                    color={colors.primary} 
                    style={{ transform: [{ rotate: selectedCircuit === circuit.id ? '90deg' : '0deg' }] }}
                  />
                </View>
                
                <View style={styles.circuitLocation}>
                  <MapPin size={16} color={colors.textSecondary} />
                  <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                    {circuit.location}
                  </Text>
                </View>
                
                <View style={styles.circuitStats}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{circuit.length}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Length</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{circuit.turns}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Turns</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{circuit.recordLap}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Record</Text>
                  </View>
                </View>
                
                {selectedCircuit === circuit.id && (
                  <View style={styles.expandedContent}>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    
                    <View style={styles.recordHolder}>
                      <Text style={[styles.recordHolderLabel, { color: colors.textSecondary }]}>
                        Record Holder:
                      </Text>
                      <Text style={[styles.recordHolderName, { color: colors.text }]}>
                        {circuit.recordHolder}
                      </Text>
                    </View>
                    
                    <View style={styles.descriptionContainer}>
                      <Info size={16} color={colors.primary} style={styles.descriptionIcon} />
                      <Text style={[styles.description, { color: colors.text }]}>
                        {circuit.description}
                      </Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.viewRacesButton, { backgroundColor: colors.primaryLight }]}
                    >
                      <Text style={[styles.viewRacesText, { color: colors.primary }]}>
                        View Races at this Circuit
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  circuitCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  circuitImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  circuitInfo: {
    padding: 16,
  },
  circuitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  circuitName: {
    fontSize: 18,
    fontWeight: '600',
  },
  circuitLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 14,
  },
  circuitStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  expandedContent: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  recordHolder: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  recordHolderLabel: {
    fontSize: 14,
    marginRight: 6,
  },
  recordHolderName: {
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  descriptionIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  description: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  viewRacesButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewRacesText: {
    fontWeight: '500',
  },
});