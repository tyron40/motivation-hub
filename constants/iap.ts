export const IAP_PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'com.tyrotech.motivationhub.premium.monthly',
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
    productId: IAP_PRODUCT_IDS.PREMIUM_MONTHLY,
    title: 'Premium - Ad-Free',
    description: 'Remove all ads and enjoy an uninterrupted experience.',
    isPremium: true,
    popular: true,
    badge: 'AD-FREE',
  },
];

export const ALL_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
