import mobileAds, {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { AD_CONFIG, AD_UNIT_IDS } from '@/constants/admob';

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

  private interstitial: InterstitialAd | null = null;
  private rewarded: RewardedAd | null = null;

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

    await mobileAds().initialize();
    this.log('AdMob initialized');

    const interstitialUnitId = __DEV__
      ? TestIds.INTERSTITIAL
      : (AD_UNIT_IDS.interstitial ?? TestIds.INTERSTITIAL);

    const rewardedUnitId = __DEV__
      ? TestIds.REWARDED
      : (AD_UNIT_IDS.rewarded ?? TestIds.REWARDED);

    this.interstitial = InterstitialAd.createForAdRequest(interstitialUnitId, AD_CONFIG.requestOptions);
    this.rewarded = RewardedAd.createForAdRequest(rewardedUnitId, AD_CONFIG.requestOptions);

    this.attachInterstitialListeners();
    this.attachRewardedListeners();

    this.loadInterstitial();
    this.loadRewarded();

    this.isInitialized = true;
  }

  private attachInterstitialListeners() {
    if (!this.interstitial) return;

    this.interstitial.addAdEventListener(AdEventType.LOADED, () => {
      this.state.isInterstitialLoading = false;
      this.state.isInterstitialReady = true;
      this.state.retryAttempts = 0;
      this.log('Interstitial loaded');
    });

    this.interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      this.state.isInterstitialLoading = false;
      this.state.isInterstitialReady = false;
      this.log('Interstitial error', error);
    });

    this.interstitial.addAdEventListener(AdEventType.OPENED, () => {
      this.log('Interstitial opened');
    });

    this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      this.log('Interstitial closed');
      this.state.isInterstitialReady = false;
      this.state.lastInterstitialShownAt = Date.now();
      this.resetInteractionCount();
      this.loadInterstitial();
    });
  }

  private attachRewardedListeners() {
    if (!this.rewarded) return;

    this.rewarded.addAdEventListener(AdEventType.LOADED, () => {
      this.state.isRewardedLoading = false;
      this.state.isRewardedReady = true;
      this.log('Rewarded loaded');
    });

    this.rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
      this.state.isRewardedLoading = false;
      this.state.isRewardedReady = false;
      this.log('Rewarded error', error);
    });

    this.rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      this.log('Reward earned', reward);
      this.onRewardEarned?.(reward);
    });

    this.rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      this.log('Rewarded closed');
      this.state.isRewardedReady = false;
      this.loadRewarded();
    });
  }

  private loadInterstitial() {
    if (!this.interstitial || this.state.isInterstitialLoading) return;
    this.state.isInterstitialLoading = true;
    this.state.isInterstitialReady = false;
    this.log('Loading interstitial');
    this.interstitial.load();
  }

  private loadRewarded() {
    if (!this.rewarded || this.state.isRewardedLoading) return;
    this.state.isRewardedLoading = true;
    this.state.isRewardedReady = false;
    this.log('Loading rewarded');
    this.rewarded.load();
  }

  canShowInterstitial(): boolean {
    const cooldownMs = AD_CONFIG.INTERSTITIAL_COOLDOWN;
    const enoughTimePassed =
      Date.now() - this.state.lastInterstitialShownAt > cooldownMs;

    return this.state.isInterstitialReady &&
      enoughTimePassed &&
      this.state.interactionCount >= 3;
  }

  recordInteraction(): boolean {
    this.state.interactionCount += 1;
    this.log('Interaction recorded', { count: this.state.interactionCount });
    return this.canShowInterstitial();
  }

  resetInteractionCount() {
    this.state.interactionCount = 0;
  }

  async showInterstitial(): Promise<boolean> {
    if (!this.interstitial || !this.state.isInterstitialReady) {
      this.log('Interstitial not ready');
      return false;
    }

    try {
      await this.interstitial.show();
      return true;
    } catch (error) {
      this.log('Failed to show interstitial', error);
      this.state.isInterstitialReady = false;
      this.loadInterstitial();
      return false;
    }
  }

  async showRewarded(): Promise<boolean> {
    if (!this.rewarded || !this.state.isRewardedReady) {
      this.log('Rewarded not ready');
      return false;
    }

    try {
      await this.rewarded.show();
      return true;
    } catch (error) {
      this.log('Failed to show rewarded', error);
      this.state.isRewardedReady = false;
      this.loadRewarded();
      return false;
    }
  }

  getState(): Readonly<AdManagerState> {
    return { ...this.state };
  }

  get interstitialReady() {
    return this.state.isInterstitialReady;
  }

  get rewardedReady() {
    return this.state.isRewardedReady;
  }

  get initialized() {
    return this.isInitialized;
  }

  destroy() {
    this.isInitialized = false;
    this.interstitial = null;
    this.rewarded = null;
    AdManager.instance = null;
  }
}

export default AdManager;
