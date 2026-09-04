import { Settings } from 'react-native';

type AdEventCallback = (event: string, data?: any) => void;

// Frequency caps mirror AdManager exactly so the Appodeal mediation layer
// never increases ad frequency relative to the existing AdMob-only setup.
const INTERSTITIAL_COOLDOWN_MS = 30 * 1000;
const INTERACTIONS_BETWEEN_ADS = 2;
const AD_CLOSE_TIMEOUT_MS = 120000;

/**
 * Development-only ad diagnostics.
 * Enabled automatically in dev builds; in release builds set
 * EXPO_PUBLIC_APPODEAL_DEBUG=1 in the EAS build environment.
 */
export const ADS_DEBUG = __DEV__ || process.env.EXPO_PUBLIC_APPODEAL_DEBUG === '1';

const debugLog = (message: string) => {
  if (ADS_DEBUG) console.log(message);
};

const consentStatusName = (status: number): string => {
  switch (status) {
    case 1: return 'REQUIRED';
    case 2: return 'NOT_REQUIRED';
    case 3: return 'OBTAINED';
    default: return 'UNKNOWN';
  }
};

const privacyStatusName = (status: number): string => {
  switch (status) {
    case 1: return 'REQUIRED';
    case 2: return 'NOT_REQUIRED';
    default: return 'UNKNOWN';
  }
};

/**
 * Appodeal mediation layer — NATIVE ONLY (iOS/Android).
 *
 * Metro resolves this file as `AppodealManager` only on native platforms
 * (`.native.ts`); web resolves `AppodealManager.web.ts` instead, so
 * `react-native-appodeal` is never bundled for web.
 *
 * Initialized only when EXPO_PUBLIC_APPODEAL_APP_KEY is set and the native
 * module is present (EAS builds). In Expo Go the module is unavailable and
 * every method degrades to a safe no-op, letting the existing AdMob path
 * (AdManager) serve ads unchanged.
 */
const APPODEAL_APP_KEY = process.env.EXPO_PUBLIC_APPODEAL_APP_KEY;

let Appodeal: any = null;
let AdType: any = null;
let SdkEvents: any = null;
let InterstitialEvents: any = null;
let RewardedEvents: any = null;
let BannerEvents: any = null;
let ConsentStatus: any = null;
let AdsConsent: any = null;
let moduleLoaded = false;

if (APPODEAL_APP_KEY) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appodealModule = require('react-native-appodeal');
    Appodeal = appodealModule.default ?? appodealModule;
    AdType = appodealModule.AppodealAdType;
    SdkEvents = appodealModule.AppodealSdkEvents;
    InterstitialEvents = appodealModule.AppodealInterstitialEvents;
    RewardedEvents = appodealModule.AppodealRewardedEvents;
    BannerEvents = appodealModule.AppodealBannerEvents;
    ConsentStatus = appodealModule.AppodealConsentStatus;
    moduleLoaded = Boolean(Appodeal && AdType);
    console.log('✅ [AppodealManager] Appodeal SDK loaded (mediation layer)');
  } catch {
    console.log('📡 [AppodealManager] Appodeal SDK not available - mediation disabled');
  }

  // Google UMP (via react-native-google-mobile-ads) — used only to check whether
  // an IAB TCF consent string exists. Never reads/logs the string value itself.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admobModule = require('react-native-google-mobile-ads');
    AdsConsent = admobModule.AdsConsent ?? null;
  } catch {
    AdsConsent = null;
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
  /** True while a debug-only post-consent verification ad is pending show. */
  private postConsentAdRequested = false;

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
    debugLog(`[Appodeal] active: ${this.active}`);
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
    if (this.initialized) return;
    console.log('[Appodeal] initialize requested');
    if (!this.available) {
      debugLog(
        `[Appodeal] unavailable (${
          moduleLoaded ? 'app key missing from build environment' : 'native module not present'
        }) — AdMob serves directly`
      );
      return;
    }
    this.initialized = true;

    try {
      this.wireEvents();
      const adTypes = AdType.INTERSTITIAL | AdType.BANNER | AdType.REWARDED_VIDEO;
      Appodeal.initialize(APPODEAL_APP_KEY, adTypes);

      // Explicitly request inventory so the first fill never depends on
      // native autocache timing alone.
      try {
        Appodeal.cache(AdType.INTERSTITIAL);
        Appodeal.cache(AdType.REWARDED_VIDEO);
      } catch (cacheError: any) {
        debugLog(`[Appodeal] explicit cache request failed: ${cacheError?.message ?? 'unknown'}`);
      }

      debugLog(`[Appodeal] initializing (app key present, never logged) | test mode: setTesting() never called → off`);
      try {
        debugLog(`[Appodeal] SDK version: ${Appodeal.getVersion?.() ?? 'unknown'}`);
      } catch {}
      this.log('Initializing Appodeal SDK (interstitial, banner, rewarded)...');
      // Appodeal 4.2.0 requests consent automatically during initialization
      // (Stack Consent Manager / Google UMP included by default). The explicit
      // re-sync below makes the flow deterministic and observable in debug logs.
      void this.syncConsent();
    } catch (error) {
      this.initialized = false;
      this.log('Failed to initialize Appodeal SDK', error);
    }
  }

  private wireEvents() {
    const add = (event: string, handler: (...args: any[]) => void) => {
      if (!event) return;
      try {
        const subscription = Appodeal.addEventListener(event, handler);
        if (subscription && typeof subscription.remove === 'function') {
          this.eventSubscriptions.push(subscription);
        }
      } catch (error) {
        this.log(`Failed to subscribe to ${event}`, error);
      }
    };

    add(SdkEvents.INITIALIZED, () => {
      debugLog('[Appodeal] SDK initialized');
      debugLog(`[Appodeal] active: ${this.active}`);
      this.syncLoadedState();
      this.log('initialized/active');
    });

    add(InterstitialEvents.LOADED, () => {
      this.interstitialReady = true;
      debugLog('[Appodeal] interstitial loaded');
      this.log('Interstitial loaded ✅');
    });
    add(InterstitialEvents.FAILED_TO_LOAD, (error: any) => {
      this.interstitialReady = false;
      this.log('Interstitial failed to load ❌', error);
    });
    add(InterstitialEvents.SHOWN, () => {
      this.lastInterstitialShownAt = Date.now();
      debugLog('[Appodeal] interstitial shown');
      if (this.postConsentAdRequested) {
        this.postConsentAdRequested = false;
        debugLog('[Appodeal CMP] post-consent ad confirmed — native interstitial shown callback fired');
      }
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
      // Immediately request fresh inventory: without this the shown ad was
      // never replaced, so after the FIRST interstitial of a session every
      // later trigger found Appodeal empty and silently fell back to AdMob.
      try {
        Appodeal.cache(AdType.INTERSTITIAL);
        debugLog('[Appodeal] interstitial re-cache requested after close');
      } catch {}
    });

    // Banner lifecycle (loaded/shown fire from the native SDK, not from UI)
    add(BannerEvents?.LOADED, () => debugLog('[Appodeal] banner loaded'));
    add(BannerEvents?.SHOWN, () => debugLog('[Appodeal] banner shown'));

    add(RewardedEvents.LOADED, () => {
      this.rewardedReady = true;
      debugLog('[Appodeal] rewarded loaded');
      this.log('Rewarded video loaded ✅');
    });
    add(RewardedEvents.FAILED_TO_LOAD, (error: any) => {
      this.rewardedReady = false;
      this.log('Rewarded video failed to load ❌', error);
    });
    add(RewardedEvents.SHOWN, () => debugLog('[Appodeal] rewarded shown'));

    add(RewardedEvents.REWARD, (reward: any) => {
      debugLog('[Appodeal] rewarded finished');
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
      // Same refill gap as the interstitial: request the next rewarded video
      // as soon as the current one is dismissed.
      try {
        Appodeal.cache(AdType.REWARDED_VIDEO);
        debugLog('[Appodeal] rewarded re-cache requested after close');
      } catch {}
    });
  }

  // ─── Consent (Stack Consent Manager / Google UMP) ─────────────

  /**
   * Appodeal 4.2.0 CMP flow: request consent info, present the native UMP
   * consent form when required, and log every step (debug builds only).
   */
  private async syncConsent(): Promise<void> {
    try {
      const status = await Appodeal.requestConsentInfoUpdate(APPODEAL_APP_KEY);
      debugLog(`[Appodeal CMP] consent info update completed: ${consentStatusName(status)}`);
      const required = status === (ConsentStatus?.REQUIRED ?? 1);
      debugLog(`[Appodeal CMP] consent form required: ${required}`);
      debugLog(
        `[Appodeal CMP] privacy options requirement status: ${privacyStatusName(
          this.privacyOptionsRequirementStatus()
        )}`
      );
      if (required) {
        debugLog('[Appodeal CMP] consent form presented');
        const finalStatus = await Appodeal.showConsentFormIfNeeded();
        debugLog(`[Appodeal CMP] consent form dismissed: ${consentStatusName(finalStatus)}`);
      }
      this.logTCStringPresence();
      await this.verifyConsentAfterForm();
    } catch (error: any) {
      debugLog(`[Appodeal CMP] consent sync error: ${error?.message ?? 'unknown'}`);
    }
  }

  /** Logs only whether an IAB TCF consent string exists — never the string itself. */
  private logTCStringPresence(): void {
    if (!AdsConsent?.getTCString) return;
    try {
      Promise.resolve(AdsConsent.getTCString())
        .then((tcString: string | null) => {
          debugLog(`[Appodeal CMP] IAB TCF consent string exists: ${Boolean(tcString && tcString.length > 0)}`);
        })
        .catch(() => debugLog('[Appodeal CMP] IAB TCF consent string exists: false (read failed)'));
    } catch {
      // TCF presence check is best-effort
    }
  }

  // ─── Debug-only post-consent verification ─────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reads IAB TCF presence flags from NSUserDefaults (iOS) / SharedPreferences
   * (Android) — the stores where Google UMP persists consent data. Presence
   * booleans only; the stored values themselves are never logged.
   */
  private readIabTcfPresence() {
    const read = (key: string): boolean => {
      try {
        const raw: unknown = Settings.get(key);
        return raw !== null && raw !== undefined && String(raw).length > 0;
      } catch {
        return false;
      }
    };
    return {
      tcString: read('IABTCF_TCString'),
      gdprApplies: read('IABTCF_gdprApplies'),
      purposeConsents: read('IABTCF_PurposeConsents'),
      vendorConsents: read('IABTCF_VendorConsents'),
    };
  }

  /** Logs consent status + IAB key presence (booleans only — never values). */
  private logConsentState() {
    let status = -1;
    try {
      status = Appodeal.consentStatus?.() ?? -1;
    } catch {}
    debugLog(`[Appodeal CMP] consent status: ${consentStatusName(status)}`);
    const presence = this.readIabTcfPresence();
    debugLog(`[Appodeal CMP] IABTCF_TCString exists: ${presence.tcString}`);
    debugLog(`[Appodeal CMP] gdprApplies exists: ${presence.gdprApplies}`);
    debugLog(`[Appodeal CMP] purpose consents exist: ${presence.purposeConsents}`);
    debugLog(`[Appodeal CMP] vendor consents exist: ${presence.vendorConsents}`);
    return presence;
  }

  /**
   * Debug-only verification after the consent form is dismissed: logs consent
   * status + IAB TCF key presence, re-runs the consent flow once if the TC
   * string is still missing, then forces one fresh Appodeal mediation request
   * (bypassing the cached AdMob fallback path entirely).
   */
  private async verifyConsentAfterForm(): Promise<void> {
    // Strictly development-only. EXPO_PUBLIC_APPODEAL_DEBUG can be enabled in
    // EAS production builds for diagnostics; this verification path also
    // FORCE-SHOWS an interstitial right after consent — in production that
    // consumed Appodeal's only cached fill seconds after launch (with no user
    // interaction), after which Appodeal never triggered again for the rest
    // of the session. The production CMP flow itself still runs in syncConsent().
    if (!__DEV__) return;

    // Give UMP a moment to persist IABTCF_* defaults after form dismissal.
    await this.delay(1000);

    let presence = this.logConsentState();

    if (!presence.tcString) {
      debugLog('[Appodeal CMP] IABTCF_TCString missing after consent — re-running consent flow');
      try {
        const status = await Appodeal.requestConsentInfoUpdate(APPODEAL_APP_KEY);
        debugLog(`[Appodeal CMP] consent info update completed: ${consentStatusName(status)}`);
        await Appodeal.showConsentFormIfNeeded();
        await this.delay(1000);
        presence = this.logConsentState();
      } catch (error: any) {
        debugLog(`[Appodeal CMP] consent retry error: ${error?.message ?? 'unknown'}`);
      }
    }

    this.requestPostConsentAd();
  }

  /**
   * Forces one fresh Appodeal ad request after consent completes. Calls the
   * Appodeal SDK directly (cache + show), so the request is served and
   * consentized by the mediation layer — never the cached AdMob fallback.
   */
  private requestPostConsentAd(): void {
    try {
      debugLog('[Appodeal CMP] requesting fresh Appodeal ad after consent');
      debugLog('[Ads] serving provider: APPODEAL');
      this.postConsentAdRequested = true;
      Appodeal.cache(AdType.INTERSTITIAL);

      const deadline = Date.now() + 15000;
      const poll = setInterval(() => {
        let loaded = false;
        try {
          loaded = Boolean(Appodeal.isLoaded(AdType.INTERSTITIAL));
        } catch {}
        if (loaded) {
          clearInterval(poll);
          try {
            Appodeal.show(AdType.INTERSTITIAL);
          } catch (error: any) {
            this.postConsentAdRequested = false;
            debugLog(`[Appodeal CMP] post-consent ad show error: ${error?.message ?? 'unknown'}`);
          }
        } else if (Date.now() > deadline) {
          clearInterval(poll);
          this.postConsentAdRequested = false;
          debugLog('[Appodeal CMP] post-consent ad request timed out (no fill)');
        }
      }, 1000);
    } catch (error: any) {
      this.postConsentAdRequested = false;
      debugLog(`[Appodeal CMP] post-consent ad request error: ${error?.message ?? 'unknown'}`);
    }
  }

  /** Appodeal 4.2.0 Privacy Entry Point: whether a Privacy Options entry must be surfaced. */
  privacyOptionsRequirementStatus(): number {
    if (!this.available) return 0;
    try {
      return Appodeal.privacyOptionsRequirementStatus() ?? 0;
    } catch {
      return 0;
    }
  }

  /** Presents the native UMP Privacy Options form (no custom UI). */
  async showPrivacyOptionsForm(): Promise<boolean> {
    if (!this.available) return false;
    try {
      debugLog('[Appodeal CMP] privacy options form presented');
      await Appodeal.showPrivacyOptionsForm();
      debugLog('[Appodeal CMP] privacy options form dismissed');
      this.logTCStringPresence();
      return true;
    } catch (error: any) {
      debugLog(`[Appodeal CMP] privacy options form error: ${error?.message ?? 'unknown'}`);
      return false;
    }
  }

  // ─── Frequency (identical caps to AdManager) ──────────────────

  /**
   * Reconciles the JS readiness flags with the native SDK ground truth.
   * Native load events can be missed during early startup (bridge timing),
   * leaving the flags stuck false while the SDK actually holds inventory.
   * The React-side poll calls this on every tick so Appodeal readiness
   * self-heals instead of staying "not ready" forever.
   */
  syncLoadedState(): void {
    if (!this.available) return;
    try {
      const interstitial = Boolean(Appodeal.isLoaded(AdType.INTERSTITIAL));
      if (interstitial !== this.interstitialReady) {
        this.interstitialReady = interstitial;
        debugLog(`[Appodeal] interstitial ${interstitial ? 'loaded' : 'not loaded'} (native sync)`);
      }
    } catch {}
    try {
      const rewarded = Boolean(Appodeal.isLoaded(AdType.REWARDED_VIDEO));
      if (rewarded !== this.rewardedReady) {
        this.rewardedReady = rewarded;
        debugLog(`[Appodeal] rewarded ${rewarded ? 'loaded' : 'not loaded'} (native sync)`);
      }
    } catch {}
  }

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
