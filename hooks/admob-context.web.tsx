import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import { AD_CONFIG } from '@/constants/admob';

const { REWARD_AMOUNT } = AD_CONFIG;

export const [AdMobProvider, useAdMob] = createContextHook(() => {
  const [isShowingAd] = useState(false);

  const showRewardedAd = useCallback(async () => {
    console.log('📺 AdMob not available on web');
    return false;
  }, []);

  const showInterstitialAd = useCallback(async () => {
    console.log('📺 AdMob not available on web');
    return false;
  }, []);

  return useMemo(
    () => ({
      showRewardedAd,
      showInterstitialAd,
      isRewardedAdLoaded: false,
      isInterstitialAdLoaded: false,
      isLoadingRewardedAd: false,
      canShowAds: false,
      rewardAmount: REWARD_AMOUNT,
      isShowingAd,
    }),
    [showRewardedAd, showInterstitialAd, isShowingAd]
  );
});
