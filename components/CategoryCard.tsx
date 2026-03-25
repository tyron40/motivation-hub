import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Sun, Trophy, Zap, Brain, Target, Heart, Flame, BookOpen, Church } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';
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
  flame: Flame,
  'book-open': BookOpen,
  church: Church,
};

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onPress }) => {
  const { colors } = useTheme();
  
  if (!category || typeof category !== 'object' || !category.name) {
    return null;
  }
  
  const Icon = iconMap[category.icon] || Sun;
  const categoryColor = category.color || '#10B981';
  
  const styles = getStyles(colors);
  
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.card, { backgroundColor: categoryColor + '20' }]}>
        <View style={[styles.iconContainer, { backgroundColor: categoryColor }]}>
          <Icon color={colors.text} size={24} />
        </View>
        <Text style={styles.name} numberOfLines={2}>{String(category.name)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  card: {
    width: 110,
    height: 110,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
});
