import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Sun, Trophy, Zap, Brain, Target, Heart } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Category } from '@/types/speech';

interface CategoryCardProps {
  category: Category;
  onPress: () => void;
}

const iconMap: { [key: string]: any } = {
  sun: Sun,
  trophy: Trophy,
  zap: Zap,
  brain: Brain,
  target: Target,
  heart: Heart,
};

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onPress }) => {
  // Ensure category is a valid object
  if (!category || typeof category !== 'object' || !category.name) {
    return null;
  }
  
  const Icon = iconMap[category.icon] || Sun;
  
  // Handle both mock data structure and backend data structure
  const categoryColor = category.color || '#10B981';
  
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.card, { backgroundColor: categoryColor + '20' }]}>
        <View style={[styles.iconContainer, { backgroundColor: categoryColor }]}>
          <Icon color={Colors.text} size={24} />
        </View>
        <Text style={styles.name} numberOfLines={2}>{String(category.name)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 110,
    height: 110,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});