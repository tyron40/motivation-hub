import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useIAP } from './iap-context';

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
      console.log('📺 Showing rewarded ad (simulated in Rork)...');
      
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          '🎬 Watch Ad to Earn Credits',
          `Watch a 30-second ad to earn ${REWARD_AMOUNT} credits!\n\n💡 Note: This is simulated in Rork preview. Real ads will show in production builds with AdMob SDK.`,
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
        '🎉 Reward Earned!',
        `You earned ${REWARD_AMOUNT} credits!`,
        [{ text: 'Awesome!' }]
      );

      return true;
    } catch (error) {
      console.error('❌ Error showing rewarded ad:', error);
      Alert.alert('Error', 'Unable to show ad. Please try again later.');
      return false;
    } finally {
      setIsShowingAd(false);
    }
  }, [canShowAds, isShowingAd, addCredits]);

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
      console.log('📺 Showing interstitial ad (simulated in Rork)...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      setLastInterstitialTime(now);
      console.log('✅ Interstitial ad completed (simulated)');
      return true;
    } catch (error) {
      console.error('❌ Error showing interstitial ad:', error);
      return false;
    } finally {
      setIsShowingAd(false);
    }
  }, [canShowAds, isShowingAd, lastInterstitialTime]);

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
