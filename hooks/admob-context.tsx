import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { useIAP } from './iap-context';

let RewardedAd: any = null;
let InterstitialAd: any = null;
let RewardedAdEventType: any = null;
let InterstitialAdEventType: any = null;
let mobileAds: any = null;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admobModule = require('react-native-google-mobile-ads');
    RewardedAd = admobModule.RewardedAd;
    InterstitialAd = admobModule.InterstitialAd;
    RewardedAdEventType = admobModule.RewardedAdEventType;
    InterstitialAdEventType = admobModule.AdEventType;
    mobileAds = admobModule.default;
  } catch {
    console.log('📺 AdMob SDK not available - using simulation mode');
  }
}

const REWARD_AMOUNT = 10;
const INTERSTITIAL_COOLDOWN = 10 * 60 * 1000;

export const AD_UNIT_IDS = {
  rewarded: __DEV__ 
    ? 'ca-app-pub-3940256099942544/5224354917'
    : 'ca-app-pub-7788769813708919/3545832687',
  interstitial: __DEV__
    ? 'ca-app-pub-3940256099942544/1033173712'
    : 'ca-app-pub-7788769813708919/4053276756',
  banner: __DEV__
    ? 'ca-app-pub-3940256099942544/6300978111'
    : 'ca-app-pub-7788769813708919/4858914356',
};



export const [AdMobProvider, useAdMob] = createContextHook(() => {
  const { addCredits, usageStats } = useIAP();
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [lastInterstitialTime, setLastInterstitialTime] = useState(0);
  const [rewardedAdInstance, setRewardedAdInstance] = useState<any>(null);
  const [interstitialAdInstance, setInterstitialAdInstance] = useState<any>(null);
  const [isRewardedAdLoaded, setIsRewardedAdLoaded] = useState(false);
  const [isInterstitialAdLoaded, setIsInterstitialAdLoaded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAdMob = async () => {
      if (Platform.OS === 'web' || !mobileAds || !RewardedAd || !InterstitialAd) {
        console.log('📺 Running in simulation mode (web or SDK not available)');
        setIsInitialized(true);
        return;
      }

      try {
        console.log('📺 Initializing AdMob SDK...');
        await mobileAds().initialize();
        console.log('✅ AdMob SDK initialized');
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Error initializing AdMob:', error);
        setIsInitialized(true);
      }
    };

    initializeAdMob();
  }, []);

  useEffect(() => {
    if (!isInitialized || Platform.OS === 'web' || !RewardedAd) {
      return;
    }

    try {
      console.log('📺 Creating rewarded ad instance...');
      const rewarded = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded, {
        requestNonPersonalizedAdsOnly: false,
      });

      const loadedListener = rewarded.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          console.log('✅ Rewarded ad loaded');
          setIsRewardedAdLoaded(true);
        }
      );

      const earnedListener = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        async (reward: any) => {
          console.log('🎁 Reward earned:', reward);
          await addCredits(REWARD_AMOUNT);
          Alert.alert(
            '🎉 Reward Earned!',
            `You earned ${REWARD_AMOUNT} credits!`,
            [{ text: 'Awesome!' }]
          );
        }
      );

      const closedListener = rewarded.addAdEventListener(
        RewardedAdEventType.CLOSED,
        () => {
          console.log('📺 Rewarded ad closed');
          setIsShowingAd(false);
          setIsRewardedAdLoaded(false);
          rewarded.load();
        }
      );

      rewarded.load();
      setRewardedAdInstance(rewarded);

      return () => {
        loadedListener?.();
        earnedListener?.();
        closedListener?.();
      };
    } catch (error) {
      console.error('❌ Error setting up rewarded ad:', error);
    }
  }, [isInitialized, addCredits]);

  useEffect(() => {
    if (!isInitialized || Platform.OS === 'web' || !InterstitialAd) {
      return;
    }

    try {
      console.log('📺 Creating interstitial ad instance...');
      const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial, {
        requestNonPersonalizedAdsOnly: false,
      });

      const loadedListener = interstitial.addAdEventListener(
        InterstitialAdEventType.LOADED,
        () => {
          console.log('✅ Interstitial ad loaded');
          setIsInterstitialAdLoaded(true);
        }
      );

      const closedListener = interstitial.addAdEventListener(
        InterstitialAdEventType.CLOSED,
        () => {
          console.log('📺 Interstitial ad closed');
          setIsShowingAd(false);
          setIsInterstitialAdLoaded(false);
          interstitial.load();
        }
      );

      interstitial.load();
      setInterstitialAdInstance(interstitial);

      return () => {
        loadedListener?.();
        closedListener?.();
      };
    } catch (error) {
      console.error('❌ Error setting up interstitial ad:', error);
    }
  }, [isInitialized]);

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

    if (rewardedAdInstance && isRewardedAdLoaded) {
      try {
        console.log('📺 Showing real rewarded ad...');
        setIsShowingAd(true);
        await rewardedAdInstance.show();
        return true;
      } catch (error: any) {
        console.error('❌ Error showing rewarded ad:', error);
        setIsShowingAd(false);
        
        if (error?.code === 'ad-not-ready' || error?.message?.includes('not ready')) {
          Alert.alert('Ad Not Ready', 'The ad is still loading. Please try again in a moment.');
        } else {
          Alert.alert('Error', 'Unable to show ad. Please try again later.');
        }
        return false;
      }
    } else {
      console.log('📺 Real ad not available, using simulation mode...');
      setIsShowingAd(true);

      try {
        const confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            '🎬 Watch Ad to Earn Credits',
            `Watch a 30-second ad to earn ${REWARD_AMOUNT} credits!\n\n💡 Note: This is simulated. Real ads will show in TestFlight/production builds.`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Simulate Ad', onPress: () => resolve(true) },
            ]
          );
        });

        if (!confirmed) {
          console.log('ℹ️ User cancelled ad');
          setIsShowingAd(false);
          return false;
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
        console.log(`🎁 Simulating reward: ${REWARD_AMOUNT} credits`);
        await addCredits(REWARD_AMOUNT);
        
        Alert.alert(
          '🎉 Reward Earned!',
          `You earned ${REWARD_AMOUNT} credits!`,
          [{ text: 'Awesome!' }]
        );

        setIsShowingAd(false);
        return true;
      } catch (error) {
        console.error('❌ Error in simulation:', error);
        setIsShowingAd(false);
        Alert.alert('Error', 'Unable to show ad. Please try again later.');
        return false;
      }
    }
  }, [canShowAds, isShowingAd, addCredits, rewardedAdInstance, isRewardedAdLoaded]);

  const showInterstitialAd = useCallback(async () => {
    if (!canShowAds) {
      console.log('📺 Ads disabled for premium user');
      return false;
    }

    const now = Date.now();
    const timeSinceLastAd = now - lastInterstitialTime;

    if (timeSinceLastAd < INTERSTITIAL_COOLDOWN) {
      console.log('⏰ Too soon to show another interstitial ad');
      return false;
    }

    if (isShowingAd) {
      console.warn('⚠️ Ad already showing');
      return false;
    }

    if (interstitialAdInstance && isInterstitialAdLoaded) {
      try {
        console.log('📺 Showing real interstitial ad...');
        setIsShowingAd(true);
        await interstitialAdInstance.show();
        setLastInterstitialTime(now);
        return true;
      } catch (error: any) {
        console.error('❌ Error showing interstitial ad:', error);
        setIsShowingAd(false);
        return false;
      }
    } else {
      console.log('📺 Real ad not available, using simulation...');
      setIsShowingAd(true);

      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setLastInterstitialTime(now);
        console.log('✅ Interstitial ad completed (simulated)');
        return true;
      } catch (error) {
        console.error('❌ Error in simulation:', error);
        return false;
      } finally {
        setIsShowingAd(false);
      }
    }
  }, [canShowAds, isShowingAd, lastInterstitialTime, interstitialAdInstance, isInterstitialAdLoaded]);

  return useMemo(
    () => ({
      showRewardedAd,
      showInterstitialAd,
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
      isShowingAd,
      canShowAds,
      isRewardedAdLoaded,
      isInterstitialAdLoaded,
      isInitialized,
    ]
  );
});
