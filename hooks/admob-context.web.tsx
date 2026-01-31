import createContextHook from '@nkzw/create-context-hook';
import { useMemo } from 'react';

const REWARD_AMOUNT = 50;

export const [AdMobProvider, useAdMob] = createContextHook(() => {
  return useMemo(
    () => ({
      showRewardedAd: async () => {
        console.log('📺 AdMob not available on web');
        return false;
      },
      showInterstitialAd: async () => {
        console.log('📺 AdMob not available on web');
        return false;
      },
      isRewardedAdLoaded: false,
      isInterstitialAdLoaded: false,
      isLoadingRewardedAd: false,
      canShowAds: false,
      rewardAmount: REWARD_AMOUNT,
      isShowingAd: false,
    }),
    []
  );
});
