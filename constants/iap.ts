export const IAP_PRODUCT_IDS = {
  CREDITS_100: 'com.tyrotech.motivationhub.credits.100',
  CREDITS_500: 'com.tyrotech.motivationhub.credits.500',
  CREDITS_1000: 'com.tyrotech.motivationhub.credits.1000',
  PREMIUM_MONTHLY: 'com.tyrotech.motivationhub.premium.monthly',
  PREMIUM_ANNUAL: 'com.tyrotech.motivationhub.premium.annual',
} as const;

export type IAPProductId = typeof IAP_PRODUCT_IDS[keyof typeof IAP_PRODUCT_IDS];

export interface IAPProduct {
  productId: IAPProductId;
  title: string;
  description: string;
  credits?: number;
  isPremium: boolean;
  badge?: string;
  popular?: boolean;
}

export const IAP_PRODUCTS: IAPProduct[] = [
  {
    productId: IAP_PRODUCT_IDS.CREDITS_100,
    title: '100 Credits',
    description: 'Perfect for trying out AI features',
    credits: 100,
    isPremium: false,
  },
  {
    productId: IAP_PRODUCT_IDS.CREDITS_500,
    title: '500 Credits',
    description: 'Best value for regular users',
    credits: 500,
    isPremium: false,
    popular: true,
    badge: 'POPULAR',
  },
  {
    productId: IAP_PRODUCT_IDS.CREDITS_1000,
    title: '1000 Credits',
    description: 'Maximum credits for power users',
    credits: 1000,
    isPremium: false,
  },
  {
    productId: IAP_PRODUCT_IDS.PREMIUM_MONTHLY,
    title: 'Premium Monthly',
    description: 'Unlimited AI chat, premium voices, and priority support',
    isPremium: true,
  },
  {
    productId: IAP_PRODUCT_IDS.PREMIUM_ANNUAL,
    title: 'Premium Annual',
    description: 'All premium features + 2 months free',
    isPremium: true,
    badge: 'BEST VALUE',
    popular: true,
  },
];

export const CREDIT_COSTS = {
  CHAT_MESSAGE: 1,
  TTS_STANDARD: 2,
  TTS_PREMIUM: 5,
  IMAGE_GENERATION: 10,
} as const;

export const PREMIUM_VOICES = ['echo', 'fable', 'onyx'] as const;
export const FREE_VOICES = ['alloy', 'nova', 'shimmer'] as const;

export const FREE_TIER_LIMITS = {
  DAILY_CHAT_MESSAGES: 10,
  DAILY_TTS_GENERATIONS: 5,
  VOICES: FREE_VOICES,
} as const;
