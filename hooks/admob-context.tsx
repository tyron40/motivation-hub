import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { useIAP } from './iap-context';
import { AD_CONFIG } from '@/constants/admob';
import AppodealManager, { ADS_DEBUG } from '@/lib/AppodealManager';

import { playbackAdCoordinator } from '@/services/PlaybackAdCoordinator';
const { REWARD_AMOUNT } = AD_CONFIG;

/** Development-only: which ad source actually serves the displayed ad. */
const logProvider = () => {
  if (ADS_DEBUG) console.log('[Ads] serving provider: APPODEAL');
};

export const [AdMobProvider, useAdMob] = createContextHook(() => {
  const { addCredits, usageStats } = useIAP();
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [isRewardedAdLoaded, setIsRewardedAdLoaded] = useState(false);
  const [isInterstitialAdLoaded, setIsInterstitialAdLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const appodeal = useMemo(() => AppodealManager.getInstance(), []);

  const beginAdDisplay = useCallback(() => {
    playbackAdCoordinator.beginAd();
    setIsShowingAd(true);
  }, []);

  const endAdDisplay = useCallback(() => {
    setIsShowingAd(false);
    playbackAdCoordinator.endAd();
  }, []);

  useEffect(() => {
    const reportAdState = () => {
      setIsRewardedAdLoaded(
        appodeal.active && appodeal.rewardedLoaded
      );

      setIsInterstitialAdLoaded(
        appodeal.active && appodeal.interstitialLoaded
      );
    };

    // Appodeal mediation layer — same reward flow as the AdMob path.
    appodeal.setRewardCallback(async (reward: any) => {
      console.log('🎁 [Appodeal] Reward earned:', reward);
      await addCredits(REWARD_AMOUNT);
      Alert.alert(
        '🎉 Reward Earned!',
        `You earned ${REWARD_AMOUNT} credits!`,
        [{ text: 'Awesome!' }]
      );
    });

    appodeal.setEventCallback((_event: string) => reportAdState());

    const init = () => {
      appodeal.initialize();
      if (ADS_DEBUG) console.log(`[Appodeal] active: ${appodeal.active}`);
      setIsInitialized(true);
      reportAdState();
    };

    init();

    pollRef.current = setInterval(() => reportAdState(), 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [appodeal, addCredits]);

  const canShowAds = useMemo(() => {
    return !usageStats.isAdFree;
  }, [usageStats.isAdFree]);

  // Premium (RevenueCat) users: immediately stop all Appodeal ad displays,
  // including any visible banner, the moment the entitlement is active.
  useEffect(() => {
    appodeal.setPremiumDisabled(!canShowAds);
  }, [appodeal, canShowAds]);

  const showRewardedAd = useCallback(async () => {
    if (!canShowAds) {
      console.log('Ads disabled for premium user');
      Alert.alert(
        'Premium User',
        'You have premium access and ads are disabled. Enjoy ad-free experience!',
        [{ text: 'OK' }]
      );
      return false;
    }

    if (isShowingAd) {
      console.warn('Ad already showing');
      return false;
    }

    if (!appodeal.active || !appodeal.rewardedLoaded) {
      console.log('[Ads] Appodeal rewarded ad not ready');
      Alert.alert(
        'Ad Not Ready',
        'The ad is still loading. Please try again in a moment.',
        [{ text: 'OK' }]
      );
      return false;
    }

    try {
      logProvider();
      beginAdDisplay();

      const shown = await appodeal.showRewarded();

      endAdDisplay();
      return shown;
    } catch (error) {
      endAdDisplay();
      console.error('[Ads] Appodeal rewarded ad failed', error);
      return false;
    }
  }, [
    canShowAds,
    isShowingAd,
    appodeal,
    beginAdDisplay,
    endAdDisplay,
  ]);

  const showInterstitialAd = useCallback(async () => {
    if (!canShowAds) {
      console.log('Ads disabled for premium user');
      return false;
    }

    if (isShowingAd) {
      console.warn('Ad already showing');
      return false;
    }

    if (!appodeal.active || !appodeal.canShowInterstitial()) {
      console.log('[Ads] Appodeal interstitial not ready - skipping');
      return false;
    }

    try {
      logProvider();
      beginAdDisplay();

      const shown = await appodeal.showInterstitial();

      endAdDisplay();
      return shown;
    } catch (error) {
      endAdDisplay();
      console.error('[Ads] Appodeal interstitial failed', error);
      return false;
    }
  }, [
    canShowAds,
    isShowingAd,
    appodeal,
    beginAdDisplay,
    endAdDisplay,
  ]);

  const recordInteraction = useCallback(() => {
    return appodeal.recordInteraction();
  }, [appodeal]);

  const tryShowInterstitialOnTransition = useCallback(async () => {
    if (!canShowAds || isShowingAd) {
      return false;
    }

    const shouldShow = appodeal.recordInteraction();

    if (!shouldShow) {
      return false;
    }

    if (!appodeal.active || !appodeal.canShowInterstitial()) {
      console.log('[Ads] Appodeal transition ad not ready - skipping');
      return false;
    }

    try {
      logProvider();
      beginAdDisplay();

      const shown = await appodeal.showInterstitial();

      endAdDisplay();
      return shown;
    } catch (error) {
      endAdDisplay();
      console.error('[Ads] Appodeal transition ad failed', error);
      return false;
    }
  }, [
    canShowAds,
    isShowingAd,
    appodeal,
    beginAdDisplay,
    endAdDisplay,
  ]);

  return useMemo(
    () => ({
      showRewardedAd,
      showInterstitialAd,
      tryShowInterstitialOnTransition,
      recordInteraction,
      isRewardedAdLoaded,
      isInterstitialAdLoaded,
      isLoadingRewardedAd: !isRewardedAdLoaded && isInitialized && Platform.OS !== 'web',
      canShowAds,
      rewardAmount: REWARD_AMOUNT,
      isShowingAd,
    }),
    [
      showRewardedAd,
      showInterstitialAd,
      tryShowInterstitialOnTransition,
      recordInteraction,
      isShowingAd,
      canShowAds,
      isRewardedAdLoaded,
      isInterstitialAdLoaded,
      isInitialized,
    ]
  );
});
