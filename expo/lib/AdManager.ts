/**
 * AdManager — no-op stub.
 *
 * react-native-google-mobile-ads is a native module that cannot be installed
 * in the current Expo Go / Rork build environment. To keep the app buildable
 * and all imports resolving, AdManager is stubbed out: every method is a
 * harmless no-op that reports ads as never ready.
 *
 * To re-enable real AdMob ads, install the package manually in expo/:
 *   bun add react-native-google-mobile-ads@14.8.0
 * then restore the real implementation and re-add the plugin to app.json.
 */

type AdEventCallback = (event: string, data?: any) => void;

interface AdManagerState {
  isInterstitialLoading: boolean;
  isInterstitialReady: boolean;
  isRewardedLoading: boolean;
  isRewardedReady: boolean;
  lastInterstitialShownAt: number;
  interactionCount: number;
  retryAttempts: number;
}

class AdManager {
  private static instance: AdManager | null = null;

  private state: AdManagerState = {
    isInterstitialLoading: false,
    isInterstitialReady: false,
    isRewardedLoading: false,
    isRewardedReady: false,
    lastInterstitialShownAt: 0,
    interactionCount: 0,
    retryAttempts: 0,
  };

  private isInitialized = false;
  private onEvent: AdEventCallback | null = null;
  private onRewardEarned: ((reward: any) => void) | null = null;

  private constructor() {}

  static getInstance(): AdManager {
    if (!AdManager.instance) {
      AdManager.instance = new AdManager();
    }
    return AdManager.instance;
  }

  setEventCallback(cb: AdEventCallback) {
    this.onEvent = cb;
  }

  setRewardCallback(cb: (reward: any) => void) {
    this.onRewardEarned = cb;
  }

  private log(event: string, data?: any) {
    const prefix = '📺 [AdManager]';
    if (data) {
      console.log(`${prefix} ${event}`, data);
    } else {
      console.log(`${prefix} ${event}`);
    }
    this.onEvent?.(event, data);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.log('AdMob unavailable in this build — ads disabled');
    this.isInitialized = true;
  }

  canShowInterstitial(): boolean {
    return false;
  }

  recordInteraction(): boolean {
    this.state.interactionCount += 1;
    return false;
  }

  resetInteractionCount() {
    this.state.interactionCount = 0;
  }

  async showInterstitial(): Promise<boolean> {
    this.log('Interstitial not available (ads disabled)');
    return false;
  }

  async showRewarded(): Promise<boolean> {
    this.log('Rewarded ad not available (ads disabled)');
    return false;
  }

  getState(): Readonly<AdManagerState> {
    return { ...this.state };
  }

  get interstitialReady() {
    return false;
  }

  get rewardedReady() {
    return false;
  }

  get initialized() {
    return this.isInitialized;
  }

  destroy() {
    this.isInitialized = false;
    AdManager.instance = null;
  }
}

export default AdManager;
