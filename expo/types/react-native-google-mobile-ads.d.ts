declare module 'react-native-google-mobile-ads' {
  export default function mobileAds(): { initialize(): Promise<unknown> };
  export const TestIds: {
    INTERSTITIAL: string;
    REWARDED: string;
  };
  export enum AdEventType {
    LOADED = 'loaded',
    OPENED = 'opened',
    CLOSED = 'closed',
    ERROR = 'error',
  }
  export enum RewardedAdEventType {
    EARNED_REWARD = 'earned_reward',
  }
  export interface InterstitialAd {
    addAdEventListener(type: AdEventType | RewardedAdEventType, cb: (data?: unknown) => void): void;
    load(): void;
    show(): Promise<void>;
  }
  export interface RewardedAd {
    addAdEventListener(type: AdEventType | RewardedAdEventType, cb: (data?: unknown) => void): void;
    load(): void;
    show(): Promise<void>;
  }
  export const InterstitialAd: {
    createForAdRequest(id: string, opts?: unknown): InterstitialAd;
  };
  export const RewardedAd: {
    createForAdRequest(id: string, opts?: unknown): RewardedAd;
  };
}
