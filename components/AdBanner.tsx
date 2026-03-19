import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useAdMob } from '@/hooks/admob-context';

interface AdBannerProps {
  style?: any;
}

export function AdBanner({ style }: AdBannerProps) {
  const { canShowAds } = useAdMob();
  const [hasAdSDK, setHasAdSDK] = useState(false);
  const adModuleRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const admobModule = require('react-native-google-mobile-ads');
      adModuleRef.current = admobModule;
      setHasAdSDK(true);
      console.log('✅ Banner ad SDK loaded');
    } catch {
      console.log('ℹ️ Banner ad SDK not available (Expo Go). Will work in production.');
      setHasAdSDK(false);
    }
  }, []);

  if (!canShowAds || Platform.OS === 'web' || !hasAdSDK || !adModuleRef.current) {
    return null;
  }

  const { BannerAd, BannerAdSize } = adModuleRef.current;
  const { AD_UNIT_IDS } = require('@/constants/admob');

  return (
    <View style={[styles.bannerContainer, style]}>
      <BannerAd
        unitId={AD_UNIT_IDS.banner}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdFailedToLoad={(error: any) => {
          console.log('Banner ad failed to load:', error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    overflow: 'hidden',
  },
});
