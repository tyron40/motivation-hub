import { Platform } from 'react-native';

type AdEventCallback = (event: string, data?: any) => void;

// Frequency caps mirror AdManager exactly so the Appodeal mediation layer
// never increases ad frequency relative to the existing AdMob-only setup.
const INTERSTITIAL_COOLDOWN_MS = 30 * 1000;
const INTERACTIONS_BETWEEN_ADS = 2;
const AD_CLOSE_TIMEOUT_MS = 120000;

/**
 * Appodeal mediation layer.
 *
 * Initialized only when EXPO_PUBLIC_APPODEAL_APP_KEY is set and the native
 * module is present (EAS builds). In Expo Go / web previews the module is
 * unavailable and every method degrades to a safe no-op, letting the
 * existing AdMob path (AdManager) serve ads unchanged.
 */
const APPODEAL_APP_KEY = process.env.EXPO_PUBLIC_APPODEAL_APP_KEY;

let Appodeal: any = null;
let AdType: any = null;
let SdkEvents: any = null;
let InterstitialEvents: any = null;
let RewardedEvents: any = null;
let moduleLoaded = false;

if (Platform.OS !== 'web' && APPODEAL_APP_KEY) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appodealModule = require('react-native-appodeal');
    Appodeal = appodealModule.default ?? appodealModule;
    AdType = appodealModule.AppodealAdType;
    SdkEvents = appodealModule.AppodealSdkEvents;
    InterstitialEvents = appodealModule.AppodealInterstitialEvents;
    RewardedEvents = appodealModule.AppodealRewardedEvents;
    moduleLoaded = Boolean(Appodeal && AdType);
    console.log('✅ [AppodealManager] Appodeal SDK loaded (mediation layer)');
  } catch {
    console.log('📡 [AppodealManager] Appodeal SDK not available - mediation disabled');
  }
}

class AppodealManager {
  private static instance: AppodealManager | null = null;

  private initialized = false;
  private premiumDisabled = false;
  private interstitialReady = false;
  private rewardedReady = false;
  private lastInterstitialShownAt = 0;
  private interactionCount = 0;
  private eventSubscriptions: Array<{ remove: () => void }> = [];
  private onEvent: AdEventCallback | null = null;
  private onRewardEarned: ((reward: any) => void) | null = null;
  private interstitialCloseResolver: ((shown: boolean) => void) | null = null;
  private interstitialCloseTimeout: ReturnType<typeof setTimeout> | null = null;
  private rewardedCloseResolver: ((shown: boolean) => void) | null = null;
  private rewardedCloseTimeout: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  static getInstance(): AppodealManager {
    if (!AppodealManager.instance) {
      AppodealManager.instance = new AppodealManager();
    }
    return AppodealManager.instance;
  }

  /** Native module + app key present (EAS build with key configured). */
  get available(): boolean {
    return moduleLoaded && Boolean(APPODEAL_APP_KEY);
  }

  /** Initialized and not suppressed by a premium entitlement. */
  get active(): boolean {
    return this.available && this.initialized && !this.premiumDisabled;
  }

  get interstitialLoaded(): boolean {
    return this.interstitialReady;
  }

  get rewardedLoaded(): boolean {
    return this.rewardedReady;
  }

  setEventCallback(cb: AdEventCallback) {
    this.onEvent = cb;
  }

  setRewardCallback(cb: (reward: any) => void) {
    this.onRewardEarned = cb;
  }

  /** Premium (RevenueCat) users: immediately stop all Appodeal ad displays. */
  setPremiumDisabled(value: boolean) {
    if (this.premiumDisabled === value) return;
    this.premiumDisabled = value;
    if (value) this.hideAll();
  }

  private log(event: string, data?: any) {
    const prefix = '📡 [AppodealManager]';
    if (data) {
      console.log(`${prefix} ${event}`, data);
    } else {
      console.log(`${prefix} ${event}`);
    }
    this.onEvent?.(event, data);
  }

  /** One-time SDK init for interstitial, banner and rewarded video. */
  initialize(): void {
    if (this.initialized || !this.available) return;
    this.initialized = true;

    try {
      this.wireEvents();
      const adTypes = AdType.INTERSTITIAL | AdType.BANNER | AdType.REWARDED_VIDEO;
      Appodeal.initialize(APPODEAL_APP_KEY, adTypes);
      this.log('Initializing Appodeal SDK (interstitial, banner, rewarded)...');
    } catch (error) {
      this.initialized = false;
      this.log('Failed to initialize Appodeal SDK', error);
    }
  }

  private wireEvents() {
    const add = (event: string, handler: (...args: any[]) => void) => {
      try {
        const subscription = Appodeal.addEventListener(event, handler);
        if (subscription && typeof subscription.remove === 'function') {
          this.eventSubscriptions.push(subscription);
        }
      } catch (error) {
        this.log(`Failed to subscribe to ${event}`, error);
      }
    };

    add(SdkEvents.INITIALIZED, () => this.log('SDK initialized'));

    add(InterstitialEvents.LOADED, () => {
      this.interstitialReady = true;
      this.log('Interstitial loaded ✅');
    });
    add(InterstitialEvents.FAILED_TO_LOAD, (error: any) => {
      this.interstitialReady = false;
      this.log('Interstitial failed to load ❌', error);
    });
    add(InterstitialEvents.SHOWN, () => {
      this.lastInterstitialShownAt = Date.now();
      this.log('Interstitial shown');
    });
    add(InterstitialEvents.FAILED_TO_SHOW, () => {
      this.log('Interstitial failed to show');
      this.resolveInterstitialClose(false);
    });
    add(InterstitialEvents.CLOSED, () => {
      this.interstitialReady = false;
      this.log('Interstitial dismissed');
      this.resolveInterstitialClose(true);
    });

    add(RewardedEvents.LOADED, () => {
      this.rewardedReady = true;
      this.log('Rewarded video loaded ✅');
    });
    add(RewardedEvents.FAILED_TO_LOAD, (error: any) => {
      this.rewardedReady = false;
      this.log('Rewarded video failed to load ❌', error);
    });
    add(RewardedEvents.REWARD, (reward: any) => {
      this.log('Reward earned 🎁', reward);
      this.onRewardEarned?.(reward);
    });
    add(RewardedEvents.FAILED_TO_SHOW, () => {
      this.log('Rewarded video failed to show');
      this.resolveRewardedClose(false);
    });
    add(RewardedEvents.CLOSED, () => {
      this.rewardedReady = false;
      this.log('Rewarded video dismissed');
      this.resolveRewardedClose(true);
    });
  }

  // ─── Frequency (identical caps to AdManager) ──────────────────

  recordInteraction(): boolean {
    this.interactionCount += 1;
    return this.interactionCount >= INTERACTIONS_BETWEEN_ADS;
  }

  canShowInterstitial(): boolean {
    if (!this.active || !this.interstitialReady) return false;
    const elapsed = Date.now() - this.lastInterstitialShownAt;
    return elapsed >= INTERSTITIAL_COOLDOWN_MS;
  }

  // ─── Interstitial ─────────────────────────────────────────────

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

  async showInterstitial(): Promise<boolean> {
    if (!this.canShowInterstitial()) {
      this.log('Interstitial not ready or cooldown active — skipping');
      return false;
    }

    try {
      this.log('Showing Appodeal interstitial...');
      const closedPromise = new Promise<boolean>((resolve) => {
        this.interstitialCloseResolver = resolve;
        this.interstitialCloseTimeout = setTimeout(() => {
          this.log('Interstitial close wait timed out — continuing');
          resolve(true);
        }, AD_CLOSE_TIMEOUT_MS);
      });

      Appodeal.show(AdType.INTERSTITIAL);
      this.interactionCount = 0;
      return await closedPromise;
    } catch (error) {
      this.log('Error showing interstitial', error);
      this.resolveInterstitialClose(false);
      return false;
    }
  }

  // ─── Rewarded video ───────────────────────────────────────────

  private resolveRewardedClose(shown: boolean) {
    if (this.rewardedCloseTimeout) {
      clearTimeout(this.rewardedCloseTimeout);
      this.rewardedCloseTimeout = null;
    }
    if (this.rewardedCloseResolver) {
      const resolver = this.rewardedCloseResolver;
      this.rewardedCloseResolver = null;
      resolver(shown);
    }
  }

  async showRewarded(): Promise<boolean> {
    if (!this.active || !this.rewardedReady) {
      this.log('Rewarded video not ready — skipping');
      return false;
    }

    try {
      this.log('Showing Appodeal rewarded video...');
      const closedPromise = new Promise<boolean>((resolve) => {
        this.rewardedCloseResolver = resolve;
        this.rewardedCloseTimeout = setTimeout(() => {
          this.log('Rewarded close wait timed out — continuing');
          resolve(true);
        }, AD_CLOSE_TIMEOUT_MS);
      });

      Appodeal.show(AdType.REWARDED_VIDEO);
      return await closedPromise;
    } catch (error) {
      this.log('Error showing rewarded video', error);
      this.resolveRewardedClose(false);
      return false;
    }
  }

  // ─── Banner ───────────────────────────────────────────────────

  /**
   * Banner is initialized but never auto-shown — no existing ad trigger
   * renders banners, so no new ad placements are introduced.
   */
  showBanner(): void {
    if (!this.active) return;
    try {
      Appodeal.show(AdType.BANNER_BOTTOM);
      this.log('Banner shown');
    } catch (error) {
      this.log('Error showing banner', error);
    }
  }

  /** Hide every Appodeal ad surface (used when premium activates). */
  hideAll(): void {
    if (!this.available) return;
    try {
      Appodeal.hide(AdType.BANNER);
      this.log('All Appodeal ads hidden (premium active)');
    } catch {
      // hiding is best-effort
    }
  }

  destroy() {
    for (const subscription of this.eventSubscriptions) {
      try { subscription.remove(); } catch {}
    }
    this.eventSubscriptions = [];
    this.resolveInterstitialClose(false);
    this.resolveRewardedClose(false);
    this.interstitialReady = false;
    this.rewardedReady = false;
    this.initialized = false;
    AppodealManager.instance = null;
  }
}

export default AppodealManager;
