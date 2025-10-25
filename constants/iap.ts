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
  price?: string;
}

export const IAP_PRODUCTS: IAPProduct[] = [
  {
    productId: IAP_PRODUCT_IDS.CREDITS_100,
    title: '100 AI Credits',
    description: 'Get 100 AI credits for chat and voice interactions.',
    credits: 100,
    isPremium: false,
    price: '$4.99',
  },
  {
    productId: IAP_PRODUCT_IDS.CREDITS_500,
    title: '500 AI Credits',
    description: 'Get 500 AI credits for extended AI conversations.',
    credits: 500,
    isPremium: false,
    popular: true,
    badge: 'BEST VALUE',
    price: '$19.99',
  },
  {
    productId: IAP_PRODUCT_IDS.CREDITS_1000,
    title: '1000 AI Credits',
    description: 'Maximum credits for unlimited AI interactions.',
    credits: 1000,
    isPremium: false,
    price: '$34.99',
  },
  {
    productId: IAP_PRODUCT_IDS.PREMIUM_MONTHLY,
    title: 'Premium - Ad-Free',
    description: 'Remove all ads and enjoy an uninterrupted experience.',
    isPremium: true,
    badge: 'AD-FREE',
    price: '$9.99/mo',
  },
  {
    productId: IAP_PRODUCT_IDS.PREMIUM_ANNUAL,
    title: 'Premium Annual',
    description: 'Ad-free for a year. Save 20% compared to monthly.',
    isPremium: true,
    badge: 'SAVE 20%',
    price: '$99.99/yr',
  },
];

export const ALL_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
