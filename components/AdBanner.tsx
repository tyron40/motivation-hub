import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useAdMob } from '@/hooks/admob-context';
import { useTheme } from '@/hooks/theme-context';
import { AD_UNIT_IDS } from '@/constants/admob';

interface AdBannerProps {
  style?: any;
}

export function AdBanner({ style }: AdBannerProps) {
  const { canShowAds } = useAdMob();
  const { colors } = useTheme();
  const [hasAdSDK, setHasAdSDK] = useState(false);
  const [BannerAdComponent, setBannerAdComponent] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const loadAdSDK = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads');
        setBannerAdComponent(() => (
          <BannerAd
            unitId={AD_UNIT_IDS.banner}
            size={BannerAdSize.BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: false,
            }}
          />
        ));
        setHasAdSDK(true);
        console.log('✅ Banner ad component loaded');
      } catch {
        console.log('ℹ️ Banner ad SDK not available (Expo Go). Will work in production.');
        setHasAdSDK(false);
      }
    };

    loadAdSDK();
  }, []);

  if (!canShowAds) {
    return null;
  }

  // Don't show anything on web or if SDK not available
  if (Platform.OS === 'web' || !hasAdSDK || !BannerAdComponent) {
    return null;
  }

  // Only show real ads
  return (
    <View style={[styles.bannerContainer, style]}>
      {BannerAdComponent}
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
  bannerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    overflow: 'hidden',
  },
  text: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
});
