/**
 * AdMob Configuration
 * 
 * IMPORTANT: This file contains the real AdMob IDs for production.
 * - App ID: Used in app.json for native configuration
 * - Ad Unit IDs: Used at runtime to load specific ad types
 * 
 * WHY NO __DEV__ CHECK:
 * TestFlight builds are NOT in dev mode, so using __DEV__ would cause
 * TestFlight to use test ads. Instead, we use Platform.select and let
 * the build environment determine which IDs to use.
 */

import { Platform } from 'react-native';

/**
 * AdMob App ID (with tilde ~)
 * This is configured in app.json and used by the native SDK
 */
export const ADMOB_APP_ID = 'ca-app-pub-7788769813708919~4966903177';

/**
 * Ad Unit IDs (with forward slash /)
 * These are used at runtime to request specific ad types
 * 
 * For testing in development, you can temporarily swap these with test IDs:
 * - Test Rewarded: 'ca-app-pub-3940256099942544/5224354917'
 * - Test Interstitial: 'ca-app-pub-3940256099942544/1033173712'
 * - Test Banner: 'ca-app-pub-3940256099942544/6300978111'
 */
export const AD_UNIT_IDS = {
  // Production Ad Unit IDs - These will show real ads in TestFlight and production
  rewarded: Platform.select({
    ios: 'ca-app-pub-7788769813708919/3545832687',
    android: 'ca-app-pub-7788769813708919/3545832687',
    default: 'ca-app-pub-7788769813708919/3545832687',
  }),
  interstitial: Platform.select({
    ios: 'ca-app-pub-7788769813708919/4053276756',
    android: 'ca-app-pub-7788769813708919/4053276756',
    default: 'ca-app-pub-7788769813708919/4053276756',
  }),
  banner: Platform.select({
    ios: 'ca-app-pub-7788769813708919/4858914356',
    android: 'ca-app-pub-7788769813708919/4858914356',
    default: 'ca-app-pub-7788769813708919/4858914356',
  }),
} as const;

/**
 * Ad Configuration
 */
export const AD_CONFIG = {
  // Credits earned per rewarded ad
  REWARD_AMOUNT: 10,
  
  // Cooldown between interstitial ads (75 seconds - managed by AdManager)
  INTERSTITIAL_COOLDOWN: 30 * 1000,
  
  // Request options for ads
  requestOptions: {
    requestNonPersonalizedAdsOnly: false,
  },
} as const;

/**
 * Check if AdMob is available on the current platform
 */
export const isAdMobAvailable = (): boolean => {
  return Platform.OS !== 'web';
};

/**
 * Get test ad unit IDs for development testing
 * Use these temporarily if you need to test ad behavior without using real ad inventory
 */
export const TEST_AD_UNIT_IDS = {
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  banner: 'ca-app-pub-3940256099942544/6300978111',
} as const;
