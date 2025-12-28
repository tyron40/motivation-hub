import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { useIAP } from './iap-context';

const isWeb = Platform.OS === 'web';
const REWARD_AMOUNT = 10;
const INTERSTITIAL_COOLDOWN = 10 * 60 * 1000;

const AD_UNIT_IDS = {
  rewarded: __DEV__ 
    ? 'ca-app-pub-3940256099942544/5224354917' // Test ID
    : 'ca-app-pub-7788769813708919/3545832687', // EarnCredits_Rewarded
  interstitial: __DEV__
    ? 'ca-app-pub-3940256099942544/1033173712' // Test ID
    : 'ca-app-pub-7788769813708919/4053276756', // AIChat_Interstitial
  banner: __DEV__
    ? 'ca-app-pub-3940256099942544/6300978111' // Test ID
    : 'ca-app-pub-7788769813708919/4858914356', // Home_Banner
};

let rewardedAd: any = null;
let interstitialAd: any = null;
let isAdMobInitialized = false;

const initializeAdMob = async () => {
  if (isWeb || isAdMobInitialized) return;
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mobileAds = require('react-native-google-mobile-ads').default;
    await mobileAds().initialize();
    isAdMobInitialized = true;
    console.log('✅ AdMob initialized successfully');
    return true;
  } catch {
    console.log('ℹ️ AdMob SDK not available (Expo Go). Ads will work in production builds.');
    return false;
  }
};

const loadRewardedAd = async () => {
  if (isWeb) return;
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RewardedAd } = require('react-native-google-mobile-ads');
    rewardedAd = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);
    await rewardedAd.load();
    console.log('✅ Rewarded ad loaded');
    return true;
  } catch {
    console.log('ℹ️ Could not load rewarded ad (Expo Go). Ads will work in production builds.');
    return false;
  }
};

const loadInterstitialAd = async () => {
  if (isWeb) return;
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { InterstitialAd } = require('react-native-google-mobile-ads');
    interstitialAd = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
    await interstitialAd.load();
    console.log('✅ Interstitial ad loaded');
    return true;
  } catch {
    console.log('ℹ️ Could not load interstitial ad (Expo Go). Ads will work in production builds.');
    return false;
  }
};

export const [AdMobProvider, useAdMob] = createContextHook(() => {
  const { addCredits, usageStats } = useIAP();
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [lastInterstitialTime, setLastInterstitialTime] = useState(0);
  const [hasRealAdSDK, setHasRealAdSDK] = useState(false);

  useEffect(() => {
    const init = async () => {
      const initialized = await initializeAdMob();
      setHasRealAdSDK(initialized || false);
      
      if (initialized) {
        await loadRewardedAd();
        await loadInterstitialAd();
      }
    };
    init();
  }, []);

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

    setIsShowingAd(true);

    try {
      console.log('📺 Showing rewarded ad...');
      
      if (hasRealAdSDK && rewardedAd) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { RewardedAdEventType } = require('react-native-google-mobile-ads');
        
        return new Promise<boolean>((resolve) => {
          const unsubscribeLoaded = rewardedAd.addAdEventListener(
            RewardedAdEventType.LOADED,
            () => {
              console.log('✅ Rewarded ad loaded, showing...');
              rewardedAd.show();
            }
          );

          const unsubscribeEarned = rewardedAd.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            async (reward: any) => {
              console.log(`🎁 User earned reward: ${reward.amount} ${reward.type}`);
              await addCredits(REWARD_AMOUNT);
              
              Alert.alert(
                '🎉 Reward Earned!',
                `You earned ${REWARD_AMOUNT} credits!`,
                [{ text: 'Awesome!' }]
              );
              
              unsubscribeLoaded();
              unsubscribeEarned();
              unsubscribeClosed();
              setIsShowingAd(false);
              
              loadRewardedAd();
              resolve(true);
            }
          );

          const unsubscribeClosed = rewardedAd.addAdEventListener(
            RewardedAdEventType.CLOSED,
            () => {
              console.log('ℹ️ Rewarded ad closed');
              unsubscribeLoaded();
              unsubscribeEarned();
              unsubscribeClosed();
              setIsShowingAd(false);
              loadRewardedAd();
              resolve(false);
            }
          );

          if (!rewardedAd.loaded) {
            rewardedAd.load();
          } else {
            rewardedAd.show();
          }
        });
      } else {
        const confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            '🎬 Watch Ad to Earn Credits',
            `Watch a 30-second ad to earn ${REWARD_AMOUNT} credits!\n\n💡 Note: Real ads will show when you build the app for production (not in Expo Go).`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Simulate Ad', onPress: () => resolve(true) },
            ]
          );
        });

        if (!confirmed) {
          console.log('ℹ️ User cancelled ad');
          return false;
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));

        console.log(`🎁 Simulating reward: ${REWARD_AMOUNT} credits`);
        await addCredits(REWARD_AMOUNT);
        
        Alert.alert(
          '🎉 Reward Earned! (Simulated)',
          `You earned ${REWARD_AMOUNT} credits! Real ads will work in production builds.`,
          [{ text: 'Awesome!' }]
        );

        return true;
      }
    } catch (error) {
      console.error('❌ Error showing rewarded ad:', error);
      Alert.alert('Error', 'Unable to show ad. Please try again later.');
      return false;
    } finally {
      setIsShowingAd(false);
    }
  }, [canShowAds, isShowingAd, addCredits, hasRealAdSDK]);

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

    setIsShowingAd(true);

    try {
      console.log('📺 Showing interstitial ad...');
      
      if (hasRealAdSDK && interstitialAd) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { InterstitialAdEventType } = require('react-native-google-mobile-ads');
        
        return new Promise<boolean>((resolve) => {
          const unsubscribeLoaded = interstitialAd.addAdEventListener(
            InterstitialAdEventType.LOADED,
            () => {
              console.log('✅ Interstitial ad loaded, showing...');
              interstitialAd.show();
            }
          );

          const unsubscribeClosed = interstitialAd.addAdEventListener(
            InterstitialAdEventType.CLOSED,
            () => {
              console.log('✅ Interstitial ad closed');
              setLastInterstitialTime(now);
              unsubscribeLoaded();
              unsubscribeClosed();
              setIsShowingAd(false);
              loadInterstitialAd();
              resolve(true);
            }
          );

          if (!interstitialAd.loaded) {
            interstitialAd.load();
          } else {
            interstitialAd.show();
          }
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        setLastInterstitialTime(now);
        console.log('✅ Interstitial ad completed (simulated)');
        return true;
      }
    } catch (error) {
      console.error('❌ Error showing interstitial ad:', error);
      return false;
    } finally {
      setIsShowingAd(false);
    }
  }, [canShowAds, isShowingAd, lastInterstitialTime, hasRealAdSDK]);

  return useMemo(
    () => ({
      showRewardedAd,
      showInterstitialAd,
      isRewardedAdLoaded: !isShowingAd,
      isInterstitialAdLoaded: !isShowingAd,
      isLoadingRewardedAd: false,
      canShowAds,
      rewardAmount: REWARD_AMOUNT,
      isShowingAd,
    }),
    [
      showRewardedAd,
      showInterstitialAd,
      isShowingAd,
      canShowAds,
    ]
  );
});
