/**
 * Web implementation of the Appodeal manager — a safe no-op.
 *
 * Metro resolves this file as `AppodealManager` on web (`.web.ts`), so
 * `react-native-appodeal` (native-only) is never imported or bundled for web.
 * The exported API is identical to `AppodealManager.native.ts`; every method
 * reports unavailable and the AdMob web path serves unchanged.
 */

export const ADS_DEBUG = false;

type AdEventCallback = (event: string, data?: any) => void;

class AppodealManager {
  private static instance: AppodealManager | null = null;

  private constructor() {}

  static getInstance(): AppodealManager {
    if (!AppodealManager.instance) {
      AppodealManager.instance = new AppodealManager();
    }
    return AppodealManager.instance;
  }

  /** Native SDK cannot run on web. */
  get available(): boolean {
    return false;
  }

  get active(): boolean {
    return false;
  }

  get interstitialLoaded(): boolean {
    return false;
  }

  get rewardedLoaded(): boolean {
    return false;
  }

  setEventCallback(_cb: AdEventCallback) {
    // No native events on web — callback is never invoked.
  }

  setRewardCallback(_cb: (reward: any) => void) {
    // No native rewards on web — callback is never invoked.
  }

  setPremiumDisabled(_value: boolean) {}

  initialize(): void {
    console.log('[Appodeal] unavailable on web');
  }

  privacyOptionsRequirementStatus(): number {
    return 0;
  }

  async showPrivacyOptionsForm(): Promise<boolean> {
    return false;
  }

  recordInteraction(): boolean {
    return false;
  }

  canShowInterstitial(): boolean {
    return false;
  }

  async showInterstitial(): Promise<boolean> {
    return false;
  }

  async showRewarded(): Promise<boolean> {
    return false;
  }

  showBanner(): void {}

  hideAll(): void {}

  destroy(): void {
    AppodealManager.instance = null;
  }
}

export default AppodealManager;
