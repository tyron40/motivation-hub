import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { useIAP } from './iap-context';
import { AD_CONFIG } from '@/constants/admob';
import AdManager from '@/lib/AdManager';

const { REWARD_AMOUNT } = AD_CONFIG;

export const [AdMobProvider, useAdMob] = createContextHook(() => {
  const { addCredits, usageStats } = useIAP();
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [isRewardedAdLoaded, setIsRewardedAdLoaded] = useState(false);
  const [isInterstitialAdLoaded, setIsInterstitialAdLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const manager = useMemo(() => AdManager.getInstance(), []);

  useEffect(() => {
    manager.setRewardCallback(async (reward: any) => {
      console.log('🎁 [AdMob] Reward earned:', reward);
      await addCredits(REWARD_AMOUNT);
      Alert.alert(
        '🎉 Reward Earned!',
        `You earned ${REWARD_AMOUNT} credits!`,
        [{ text: 'Awesome!' }]
      );
    });

    manager.setEventCallback((_event: string) => {
      const state = manager.getState();
      setIsRewardedAdLoaded(state.isRewardedReady);
      setIsInterstitialAdLoaded(state.isInterstitialReady);
    });

    const init = async () => {
      await manager.initialize();
      setIsInitialized(true);
      const state = manager.getState();
      setIsRewardedAdLoaded(state.isRewardedReady);
      setIsInterstitialAdLoaded(state.isInterstitialReady);
    };

    void init();

    pollRef.current = setInterval(() => {
      const state = manager.getState();
      setIsRewardedAdLoaded(state.isRewardedReady);
      setIsInterstitialAdLoaded(state.isInterstitialReady);
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [manager, addCredits]);

  const canShowAds = useMemo(() => {
    return !usageStats.isAdFree;
  }, [usageStats.isAdFree]);

  const showRewardedAd = useCallback(async () => {
    if (!canShowAds) {
      console.log('📺 Ads disabled for premium user');
      Alert.alert(
        'Premium User',
        'You have premium access and ads are disabled. Enjoy ad-free experience!',
        [{ text: 'OK' }]
      );
      return false;
    }

    if (isShowingAd) {
      console.warn('⚠️ Ad already showing');
      return false;
    }

    if (!manager.rewardedReady) {
      console.log('⚠️ Rewarded ad not ready');
      Alert.alert(
        'Ad Not Ready',
        'The ad is still loading. Please try again in a moment.',
        [{ text: 'OK' }]
      );
      return false;
    }

    try {
      setIsShowingAd(true);
      const shown = await manager.showRewarded();
      setIsShowingAd(false);
      return shown;
    } catch (error: any) {
      console.error('❌ Error showing rewarded ad:', error);
      setIsShowingAd(false);
      Alert.alert('Error', 'Unable to show ad. Please try again later.');
      return false;
    }
  }, [canShowAds, isShowingAd, manager]);

  const showInterstitialAd = useCallback(async () => {
    if (!canShowAds) {
      console.log('📺 Ads disabled for premium user');
      return false;
    }

    if (isShowingAd) {
      console.warn('⚠️ Ad already showing');
      return false;
    }

    if (!manager.canShowInterstitial()) {
      console.log('📺 Interstitial not available or cooldown active');
      return false;
    }

    try {
      setIsShowingAd(true);
      const shown = await manager.showInterstitial();
      setIsShowingAd(false);
      return shown;
    } catch (error: any) {
      console.error('❌ Error showing interstitial ad:', error);
      setIsShowingAd(false);
      return false;
    }
  }, [canShowAds, isShowingAd, manager]);

  const recordInteraction = useCallback(() => {
    return manager.recordInteraction();
  }, [manager]);

  const tryShowInterstitialOnTransition = useCallback(async () => {
    if (!canShowAds || isShowingAd) return false;
    const shouldShow = manager.recordInteraction();
    if (shouldShow && manager.canShowInterstitial()) {
      try {
        setIsShowingAd(true);
        const shown = await manager.showInterstitial();
        setIsShowingAd(false);
        return shown;
      } catch {
        setIsShowingAd(false);
        return false;
      }
    }
    return false;
  }, [canShowAds, isShowingAd, manager]);

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
