import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useMemo, useCallback } from 'react';

export type ThemeColor = 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'pink';

interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  card: string;
  cardBackground: string;
  surface: string;
  text: string;
  textSecondary: string;
  gradient: {
    start: string;
    middle: string;
    end: string;
  };
  categories: {
    daily: string;
    success: string;
    confidence: string;
    mindfulness: string;
    productivity: string;
    relationships: string;
  };
  tabBar: {
    active: string;
    inactive: string;
    background: string;
  };
}

const themes: Record<ThemeColor, ColorScheme> = {
  purple: {
    primary: '#9333EA',
    secondary: '#C084FC',
    accent: '#E879F9',
    background: '#0F0F1E',
    card: '#1A1A2E',
    cardBackground: '#1A1A2E',
    surface: '#1A1A2E',
    text: '#FFFFFF',
    textSecondary: '#A0A0B8',
    gradient: {
      start: '#7C3AED',
      middle: '#9333EA',
      end: '#C084FC',
    },
    categories: {
      daily: '#10B981',
      success: '#F59E0B',
      confidence: '#EF4444',
      mindfulness: '#8B5CF6',
      productivity: '#06B6D4',
      relationships: '#EC4899',
    },
    tabBar: {
      active: '#A855F7',
      inactive: '#6B6B7B',
      background: '#1A1A2E',
    },
  },
  blue: {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    accent: '#93C5FD',
    background: '#0A0E1A',
    card: '#1E293B',
    cardBackground: '#1E293B',
    surface: '#1E293B',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    gradient: {
      start: '#1E40AF',
      middle: '#3B82F6',
      end: '#60A5FA',
    },
    categories: {
      daily: '#10B981',
      success: '#F59E0B',
      confidence: '#EF4444',
      mindfulness: '#8B5CF6',
      productivity: '#06B6D4',
      relationships: '#EC4899',
    },
    tabBar: {
      active: '#3B82F6',
      inactive: '#64748B',
      background: '#1E293B',
    },
  },
  green: {
    primary: '#10B981',
    secondary: '#34D399',
    accent: '#6EE7B7',
    background: '#0F1A14',
    card: '#1A2E23',
    cardBackground: '#1A2E23',
    surface: '#1A2E23',
    text: '#FFFFFF',
    textSecondary: '#94B8A6',
    gradient: {
      start: '#059669',
      middle: '#10B981',
      end: '#34D399',
    },
    categories: {
      daily: '#10B981',
      success: '#F59E0B',
      confidence: '#EF4444',
      mindfulness: '#8B5CF6',
      productivity: '#06B6D4',
      relationships: '#EC4899',
    },
    tabBar: {
      active: '#10B981',
      inactive: '#6B7B71',
      background: '#1A2E23',
    },
  },
  orange: {
    primary: '#F97316',
    secondary: '#FB923C',
    accent: '#FDBA74',
    background: '#1A0F0A',
    card: '#2E1E1A',
    cardBackground: '#2E1E1A',
    surface: '#2E1E1A',
    text: '#FFFFFF',
    textSecondary: '#B8A094',
    gradient: {
      start: '#EA580C',
      middle: '#F97316',
      end: '#FB923C',
    },
    categories: {
      daily: '#10B981',
      success: '#F59E0B',
      confidence: '#EF4444',
      mindfulness: '#8B5CF6',
      productivity: '#06B6D4',
      relationships: '#EC4899',
    },
    tabBar: {
      active: '#F97316',
      inactive: '#7B6B64',
      background: '#2E1E1A',
    },
  },
  red: {
    primary: '#EF4444',
    secondary: '#F87171',
    accent: '#FCA5A5',
    background: '#1A0A0A',
    card: '#2E1A1A',
    cardBackground: '#2E1A1A',
    surface: '#2E1A1A',
    text: '#FFFFFF',
    textSecondary: '#B89494',
    gradient: {
      start: '#DC2626',
      middle: '#EF4444',
      end: '#F87171',
    },
    categories: {
      daily: '#10B981',
      success: '#F59E0B',
      confidence: '#EF4444',
      mindfulness: '#8B5CF6',
      productivity: '#06B6D4',
      relationships: '#EC4899',
    },
    tabBar: {
      active: '#EF4444',
      inactive: '#7B6464',
      background: '#2E1A1A',
    },
  },
  pink: {
    primary: '#EC4899',
    secondary: '#F472B6',
    accent: '#F9A8D4',
    background: '#1A0A14',
    card: '#2E1A28',
    cardBackground: '#2E1A28',
    surface: '#2E1A28',
    text: '#FFFFFF',
    textSecondary: '#B894A8',
    gradient: {
      start: '#DB2777',
      middle: '#EC4899',
      end: '#F472B6',
    },
    categories: {
      daily: '#10B981',
      success: '#F59E0B',
      confidence: '#EF4444',
      mindfulness: '#8B5CF6',
      productivity: '#06B6D4',
      relationships: '#EC4899',
    },
    tabBar: {
      active: '#EC4899',
      inactive: '#7B6471',
      background: '#2E1A28',
    },
  },
};

export const themeNames: Record<ThemeColor, string> = {
  purple: 'Violet Dream',
  blue: 'Ocean Blue',
  green: 'Forest Green',
  orange: 'Sunset Orange',
  red: 'Fire Red',
  pink: 'Rose Pink',
};

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [selectedTheme, setSelectedTheme] = useState<ThemeColor>('blue');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem('appTheme');
        if (stored && stored in themes) {
          setSelectedTheme(stored as ThemeColor);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  const changeTheme = useCallback(async (theme: ThemeColor) => {
    try {
      setSelectedTheme(theme);
      await AsyncStorage.setItem('appTheme', theme);
      console.log('✅ Theme changed to:', theme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, []);

  const colors = useMemo(() => themes[selectedTheme], [selectedTheme]);

  return useMemo(() => ({
    selectedTheme,
    changeTheme,
    colors,
    isLoading,
    themes,
    themeNames,
  }), [selectedTheme, colors, isLoading, changeTheme]);
});
