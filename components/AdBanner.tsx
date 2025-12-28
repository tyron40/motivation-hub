import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useAdMob } from '@/hooks/admob-context';
import { useTheme } from '@/hooks/theme-context';

interface AdBannerProps {
  style?: any;
}

export function AdBanner({ style }: AdBannerProps) {
  const { canShowAds } = useAdMob();
  const { colors } = useTheme();

  if (!canShowAds) {
    return null;
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }, style]}>
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          Ad Space (Banner ads show on mobile)
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }, style]}>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        📺 Banner Ad (Shows in production builds)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
});
