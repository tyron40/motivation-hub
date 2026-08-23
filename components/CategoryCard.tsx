import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Sun, Trophy, Zap, Brain, Target, Heart, Flame, BookOpen, Church } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';
import { Category } from '@/types/speech';

interface CategoryCardProps {
  category: Category;
  onPress: () => void;
  size?: 'default' | 'large';
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

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onPress,
  size = 'default',
}) => {
  const { colors } = useTheme();
  
  if (!category || typeof category !== 'object' || !category.name) {
    return null;
  }
  
  const Icon = iconMap[category.icon] || Sun;
  const categoryColor = category.color || '#10B981';
  
  const styles = getStyles(colors);
  
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View
        style={[
          styles.card,
          size === 'large' && styles.cardLarge,
          { backgroundColor: categoryColor + '20' },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            size === 'large' && styles.iconContainerLarge,
            { backgroundColor: categoryColor },
          ]}
        >
          <Icon color={colors.text} size={size === 'large' ? 26 : 21} />
        </View>
        <Text
          style={[
            styles.name,
            size === 'large' && styles.nameLarge,
          ]}
          numberOfLines={2}
        >
          {String(category.name)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  card: {
    width: 92,
    height: 92,
    borderRadius: 14,
    padding: 10,
    marginRight: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
  },
  name: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  cardLarge: {
    width: 110,
    height: 110,
    borderRadius: 17,
    padding: 12,
  },
  iconContainerLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
  },
  nameLarge: {
    fontSize: 13,
  },
});
