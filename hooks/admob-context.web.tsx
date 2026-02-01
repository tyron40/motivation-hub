import createContextHook from '@nkzw/create-context-hook';
import { useMemo, useCallback } from 'react';

export const [AdMobProvider, useAdMob] = createContextHook(() => {
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
      rewardAmount: 0,
      isShowingAd: false,
    }),
    [showRewardedAd, showInterstitialAd]
  );
});
