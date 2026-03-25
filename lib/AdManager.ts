import { Platform } from 'react-native';

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
    this.log('AdMob not available in Expo Go - ads disabled');
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
    this.log('Interstitial ads not available in Expo Go');
    return false;
  }

  async showRewarded(): Promise<boolean> {
    this.log('Rewarded ads not available in Expo Go');
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
