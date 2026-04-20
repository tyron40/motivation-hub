import React from 'react';
import { View, StyleProp, ViewStyle, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '@/constants/admob';

interface AdBannerProps {
  style?: StyleProp<ViewStyle>;
}

export function AdBanner({ style }: AdBannerProps) {
  if (Platform.OS === 'web') return null;

  const unitId = __DEV__ ? TestIds.BANNER : (AD_UNIT_IDS.banner ?? TestIds.BANNER);

  return (
    <View style={style}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
      />
    </View>
  );
}
