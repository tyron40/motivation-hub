import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { useIAP } from './iap-context';
import { AD_CONFIG } from '@/constants/admob';
import AdManager from '@/lib/AdManager';
import AppodealManager, { ADS_DEBUG } from '@/lib/AppodealManager';

const { REWARD_AMOUNT } = AD_CONFIG;

/** Development-only: which ad source actually serves the displayed ad. */
const logProvider = (provider: 'APPODEAL' | 'ADMOB FALLBACK') => {
  if (ADS_DEBUG) console.log(`[Ads] serving provider: ${provider}`);
};

export const [AdMobProvider, useAdMob] = createContextHook(() => {
  const { addCredits, usageStats } = useIAP();
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [isRewardedAdLoaded, setIsRewardedAdLoaded] = useState(false);
  const [isInterstitialAdLoaded, setIsInterstitialAdLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const manager = useMemo(() => AdManager.getInstance(), []);
  const appodeal = useMemo(() => AppodealManager.getInstance(), []);

  useEffect(() => {
    const reportAdState = () => {
      const admobState = manager.getState();

      setIsRewardedAdLoaded(
        (appodeal.active && appodeal.rewardedLoaded) ||
        admobState.isRewardedReady
      );

      setIsInterstitialAdLoaded(
        (appodeal.active && appodeal.interstitialLoaded) ||
        admobState.isInterstitialReady
      );
    };

    manager.setRewardCallback(async (reward: any) => {
      console.log('🎁 [AdMob] Reward earned:', reward);
      await addCredits(REWARD_AMOUNT);
      Alert.alert(
        '🎉 Reward Earned!',
        `You earned ${REWARD_AMOUNT} credits!`,
        [{ text: 'Awesome!' }]
      );
    });

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

    manager.setEventCallback((_event: string) => reportAdState());
    appodeal.setEventCallback((_event: string) => reportAdState());

    const init = async () => {
      await manager.initialize();
      appodeal.initialize(); // one-time; no-op without key/native module (Expo Go/web)
      if (ADS_DEBUG) console.log(`[Appodeal] active: ${appodeal.active}`);
      setIsInitialized(true);
      reportAdState();
    };

    void init();

    pollRef.current = setInterval(() => reportAdState(), 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [manager, appodeal, addCredits]);

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

    // Appodeal mediation takes priority when active; otherwise AdMob serves.
    if (appodeal.active && appodeal.rewardedLoaded) {
      try {
        logProvider('APPODEAL');
        setIsShowingAd(true);
        const shown = await appodeal.showRewarded();
        setIsShowingAd(false);
        return shown;
      } catch (error: any) {
        console.error('❌ Error showing Appodeal rewarded ad:', error);
        setIsShowingAd(false);
        return false;
      }
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
      logProvider('ADMOB FALLBACK');
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
  }, [canShowAds, isShowingAd, manager, appodeal]);

  const showInterstitialAd = useCallback(async () => {
    if (!canShowAds) {
      console.log('📺 Ads disabled for premium user');
      return false;
    }

    if (isShowingAd) {
      console.warn('⚠️ Ad already showing');
      return false;
    }

    // Appodeal gets first opportunity, but must never block AdMob.
    if (appodeal.active && appodeal.canShowInterstitial()) {
      try {
        logProvider('APPODEAL');
        setIsShowingAd(true);

        const shown = await appodeal.showInterstitial();

        setIsShowingAd(false);

        if (shown) {
          return true;
        }

        console.log('[Ads] Appodeal did not show - trying AdMob fallback');
      } catch (error: any) {
        setIsShowingAd(false);
        console.warn(
          '[Ads] Appodeal interstitial failed - trying AdMob fallback',
          error
        );
      }
    } else if (appodeal.active) {
      console.log('[Ads] Appodeal not ready - trying AdMob fallback');
    }

    try {
      logProvider('ADMOB FALLBACK');
      setIsShowingAd(true);

      const shown = await manager.showInterstitial();

      setIsShowingAd(false);
      return shown;
    } catch (error: any) {
      setIsShowingAd(false);
      console.error('❌ Error showing interstitial ad:', error);
      return false;
    }
  }, [canShowAds, isShowingAd, manager, appodeal]);

  const recordInteraction = useCallback(() => {
    return manager.recordInteraction();
  }, [manager]);

  const tryShowInterstitialOnTransition = useCallback(async () => {
    if (!canShowAds || isShowingAd) return false;

    // One interaction counter regardless of which provider serves the ad.
    const shouldShow = manager.recordInteraction();

    if (!shouldShow) {
      return false;
    }

    // Appodeal gets first opportunity when it is genuinely ready.
    if (appodeal.active && appodeal.canShowInterstitial()) {
      try {
        logProvider('APPODEAL');
        setIsShowingAd(true);

        const shown = await appodeal.showInterstitial();

        setIsShowingAd(false);

        if (shown) {
          // AdManager owns transition frequency, even when Appodeal serves.
          manager.resetInteractionCount();
          return true;
        }

        console.log('[Ads] Appodeal did not show - trying AdMob fallback');
      } catch (error: any) {
        setIsShowingAd(false);
        console.warn(
          '[Ads] Appodeal transition ad failed - trying AdMob fallback',
          error
        );
      }
    } else if (appodeal.active) {
      console.log(
        '[Ads] Appodeal transition ad not ready - trying AdMob fallback'
      );
    }

    // Active-but-empty Appodeal must never block AdMob.
    if (!manager.canShowInterstitial()) {
      console.log('[Ads] AdMob fallback interstitial not ready');
      return false;
    }

    try {
      logProvider('ADMOB FALLBACK');
      setIsShowingAd(true);

      const shown = await manager.showInterstitial();

      setIsShowingAd(false);
      return shown;
    } catch (error: any) {
      setIsShowingAd(false);
      console.error('[Ads] AdMob transition fallback failed', error);
      return false;
    }
  }, [canShowAds, isShowingAd, manager, appodeal]);

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
