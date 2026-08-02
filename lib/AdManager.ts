import { Platform } from 'react-native';
import { AD_UNIT_IDS } from '@/constants/admob';

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

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;
const INTERSTITIAL_COOLDOWN_MS = 30 * 1000;
const INTERACTIONS_BETWEEN_ADS = 2;

let RewardedAd: any = null;
let InterstitialAd: any = null;
let RewardedAdEventType: any = null;
let AdEventType: any = null;
let mobileAds: any = null;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admobModule = require('react-native-google-mobile-ads');
    RewardedAd = admobModule.RewardedAd;
    InterstitialAd = admobModule.InterstitialAd;
    RewardedAdEventType = admobModule.RewardedAdEventType;
    AdEventType = admobModule.AdEventType;
    mobileAds = admobModule.default;
    console.log('✅ [AdManager] AdMob SDK loaded');
  } catch {
    console.log('📺 [AdManager] AdMob SDK not available - simulation mode');
  }
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

  private interstitialAd: any = null;
  private rewardedAd: any = null;
  private interstitialListeners: (() => void)[] = [];
  private rewardedListeners: (() => void)[] = [];
  private isInitialized = false;
  private onEvent: AdEventCallback | null = null;
  private onRewardEarned: ((reward: any) => void) | null = null;
  private interstitialRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private rewardedRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private interstitialCloseResolver: ((shown: boolean) => void) | null = null;
  private interstitialCloseTimeout: ReturnType<typeof setTimeout> | null = null;

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
    if (Platform.OS === 'web' || !mobileAds) {
      this.log('Running in web/simulation mode');
      this.isInitialized = true;
      return;
    }

    try {
      this.log('Initializing AdMob SDK...');
      await mobileAds().initialize();
      this.log('AdMob SDK initialized');
      this.isInitialized = true;
      this.preloadInterstitial();
      this.preloadRewarded();
    } catch (error) {
      this.log('Failed to initialize AdMob', error);
      this.isInitialized = true;
    }
  }

  // ─── Interstitial ───────────────────────────────────────────

  private preloadInterstitial() {
    if (Platform.OS === 'web' || !InterstitialAd || !AdEventType) return;
    if (this.state.isInterstitialLoading || this.state.isInterstitialReady) return;

    this.cleanupInterstitialListeners();
    this.state.isInterstitialLoading = true;
    this.log('Loading interstitial ad...');

    try {
      const ad = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial, {
        requestNonPersonalizedAdsOnly: false,
      });

      const onLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        this.log('Interstitial ad loaded ✅');
        this.state.isInterstitialReady = true;
        this.state.isInterstitialLoading = false;
        this.state.retryAttempts = 0;
        this.onEvent?.('interstitial_loaded');
      });

      const onError = ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
        this.log('Interstitial ad failed to load ❌', error);
        this.state.isInterstitialReady = false;
        this.state.isInterstitialLoading = false;
        this.onEvent?.('interstitial_error', error);
        this.resolveInterstitialClose(false);
        this.scheduleInterstitialRetry();
      });

      const onClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        this.log('Interstitial ad dismissed');
        this.state.isInterstitialReady = false;
        this.state.isInterstitialLoading = false;
        this.onEvent?.('interstitial_closed');
        this.resolveInterstitialClose(true);
        this.preloadInterstitial();
      });

      const onOpened = ad.addAdEventListener(AdEventType.OPENED, () => {
        this.log('Interstitial ad shown');
        this.state.lastInterstitialShownAt = Date.now();
        this.onEvent?.('interstitial_opened');
      });

      this.interstitialListeners = [onLoaded, onError, onClosed, onOpened];
      this.interstitialAd = ad;
      ad.load();
    } catch (error) {
      this.log('Error creating interstitial ad', error);
      this.state.isInterstitialLoading = false;
      this.scheduleInterstitialRetry();
    }
  }

  private scheduleInterstitialRetry() {
    if (this.state.retryAttempts >= MAX_RETRY_ATTEMPTS) {
      this.log(`Max retry attempts (${MAX_RETRY_ATTEMPTS}) reached for interstitial`);
      this.state.retryAttempts = 0;
      return;
    }
    this.state.retryAttempts += 1;
    const delay = RETRY_DELAY_MS * this.state.retryAttempts;
    this.log(`Retrying interstitial load in ${delay / 1000}s (attempt ${this.state.retryAttempts})`);

    if (this.interstitialRetryTimer) clearTimeout(this.interstitialRetryTimer);
    this.interstitialRetryTimer = setTimeout(() => {
      this.preloadInterstitial();
    }, delay);
  }

  private cleanupInterstitialListeners() {
    for (const unsub of this.interstitialListeners) {
      try { unsub(); } catch {}
    }
    this.interstitialListeners = [];
  }

  private resolveInterstitialClose(shown: boolean) {
    if (this.interstitialCloseTimeout) {
      clearTimeout(this.interstitialCloseTimeout);
      this.interstitialCloseTimeout = null;
    }
    if (this.interstitialCloseResolver) {
      const resolver = this.interstitialCloseResolver;
      this.interstitialCloseResolver = null;
      resolver(shown);
    }
  }

  canShowInterstitial(): boolean {
    if (!this.state.isInterstitialReady) return false;
    const elapsed = Date.now() - this.state.lastInterstitialShownAt;
    return elapsed >= INTERSTITIAL_COOLDOWN_MS;
  }

  recordInteraction(): boolean {
    this.state.interactionCount += 1;
    return this.state.interactionCount >= INTERACTIONS_BETWEEN_ADS;
  }

  resetInteractionCount() {
    this.state.interactionCount = 0;
  }

  async showInterstitial(): Promise<boolean> {
    if (!this.canShowInterstitial()) {
      if (!this.state.isInterstitialReady) {
        this.log('Interstitial not ready — skipping');
        if (!this.state.isInterstitialLoading) {
          this.preloadInterstitial();
        }
      } else {
        this.log('Interstitial cooldown active — skipping');
      }
      return false;
    }

    try {
      this.log('Showing interstitial ad...');
      const closedPromise = new Promise<boolean>((resolve) => {
        this.interstitialCloseResolver = resolve;
        this.interstitialCloseTimeout = setTimeout(() => {
          this.log('Interstitial close wait timed out — continuing');
          this.resolveInterstitialClose(true);
        }, 120000);
      });

      await this.interstitialAd.show();
      this.state.isInterstitialReady = false;
      this.resetInteractionCount();
      return await closedPromise;
    } catch (error) {
      this.log('Error showing interstitial', error);
      this.state.isInterstitialReady = false;
      this.resolveInterstitialClose(false);
      this.preloadInterstitial();
      return false;
    }
  }

  // ─── Rewarded ───────────────────────────────────────────────

  private preloadRewarded() {
    if (Platform.OS === 'web' || !RewardedAd || !RewardedAdEventType) return;
    if (this.state.isRewardedLoading || this.state.isRewardedReady) return;

    this.cleanupRewardedListeners();
    this.state.isRewardedLoading = true;
    this.log('Loading rewarded ad...');

    try {
      const ad = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded, {
        requestNonPersonalizedAdsOnly: false,
      });

      const onLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.log('Rewarded ad loaded ✅');
        this.state.isRewardedReady = true;
        this.state.isRewardedLoading = false;
        this.rewardedRetryAttempts = 0;
        this.onEvent?.('rewarded_loaded');
      });

      const onEarned = ad.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward: any) => {
          this.log('Reward earned 🎁', reward);
          this.onRewardEarned?.(reward);
        }
      );

      const onClosed = ad.addAdEventListener(RewardedAdEventType.CLOSED, () => {
        this.log('Rewarded ad dismissed');
        this.state.isRewardedReady = false;
        this.state.isRewardedLoading = false;
        this.onEvent?.('rewarded_closed');
        this.preloadRewarded();
      });

      const onError = ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
        this.log('Rewarded ad failed to load ❌', error);
        this.state.isRewardedReady = false;
        this.state.isRewardedLoading = false;
        this.onEvent?.('rewarded_error', error);
        this.scheduleRewardedRetry();
      });

      this.rewardedListeners = [onLoaded, onEarned, onClosed, onError];
      this.rewardedAd = ad;
      ad.load();
    } catch (error) {
      this.log('Error creating rewarded ad', error);
      this.state.isRewardedLoading = false;
      this.scheduleRewardedRetry();
    }
  }

  private rewardedRetryAttempts = 0;

  private scheduleRewardedRetry() {
    if (this.rewardedRetryAttempts >= MAX_RETRY_ATTEMPTS) {
      this.log(`Max retry attempts reached for rewarded`);
      this.rewardedRetryAttempts = 0;
      return;
    }
    this.rewardedRetryAttempts += 1;
    const delay = RETRY_DELAY_MS * this.rewardedRetryAttempts;
    this.log(`Retrying rewarded load in ${delay / 1000}s (attempt ${this.rewardedRetryAttempts})`);

    if (this.rewardedRetryTimer) clearTimeout(this.rewardedRetryTimer);
    this.rewardedRetryTimer = setTimeout(() => {
      this.preloadRewarded();
    }, delay);
  }

  private cleanupRewardedListeners() {
    for (const unsub of this.rewardedListeners) {
      try { unsub(); } catch {}
    }
    this.rewardedListeners = [];
  }

  async showRewarded(): Promise<boolean> {
    if (!this.state.isRewardedReady || !this.rewardedAd) {
      this.log('Rewarded ad not ready — skipping');
      if (!this.state.isRewardedLoading) {
        this.preloadRewarded();
      }
      return false;
    }

    try {
      this.log('Showing rewarded ad...');
      await this.rewardedAd.show();
      this.state.isRewardedReady = false;
      return true;
    } catch (error) {
      this.log('Error showing rewarded ad', error);
      this.state.isRewardedReady = false;
      this.preloadRewarded();
      return false;
    }
  }

  // ─── State Getters ──────────────────────────────────────────

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
    this.cleanupInterstitialListeners();
    this.cleanupRewardedListeners();
    if (this.interstitialRetryTimer) clearTimeout(this.interstitialRetryTimer);
    if (this.rewardedRetryTimer) clearTimeout(this.rewardedRetryTimer);
    if (this.interstitialCloseTimeout) clearTimeout(this.interstitialCloseTimeout);
    this.interstitialCloseResolver = null;
    this.interstitialCloseTimeout = null;
    this.interstitialAd = null;
    this.rewardedAd = null;
    this.isInitialized = false;
    AdManager.instance = null;
  }
}

export default AdManager;
