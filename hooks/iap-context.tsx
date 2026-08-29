import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import Constants from 'expo-constants';
import { IAPProductId, ALL_VOICES, IAP_PRODUCT_IDS } from '@/constants/iap';
import { useAuth } from './auth-context';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

const REVENUECAT_API_KEY =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

interface Entitlements {
  credits: number;
  isPremium: boolean;
  premiumExpiresAt: number | null;
}

interface UsageStats {
  credits: number;
  isAdFree: boolean;
  availableVoices: readonly string[];
  canUseAI: boolean;
}

const DEFAULT_ENTITLEMENTS_AUTHENTICATED: Entitlements = {
  credits: 10,
  isPremium: false,
  premiumExpiresAt: null,
};

export const [IAPProvider, useIAP] = createContextHook(() => {
  const { isAuthenticated, user } = useAuth();
  const storageKey = useMemo(() => `entitlements:${user?.id ?? 'guest'}`, [user?.id]);
  const [entitlements, setEntitlements] = useState<Entitlements>(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
  const entitlementsRef = useRef<Entitlements>(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const isDemoAccount = user?.email === 'demo@motivationhub.app';

  // Helper to read the active premium entitlement, keeping compatibility for both 'premium' and 'Premium'
  const getPremiumEntitlement = useCallback((customerInfo: CustomerInfo) => {
    return (
      customerInfo.entitlements.active['premium'] ||
      customerInfo.entitlements.active['Premium'] ||
      null
    );
  }, []);

  useEffect(() => {
    const configureRevenueCat = async () => {
      try {
        console.log('[IAP Config]', {
          platform: Platform.OS,
          native: isNative,
          appOwnership: Constants.appOwnership,
          hasIOSKey: Boolean(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY),
          hasAndroidKey: Boolean(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY),
        });

        if (!isNative) {
          console.log('ℹ️ RevenueCat disabled on web');
          setIsConfigured(false);
          return;
        }

        const appOwnership = Constants.appOwnership;
        if (appOwnership === 'expo') {
          console.log('⚠️ RevenueCat not available in Expo Go');
          setIsConfigured(false);
          return;
        }

        if (!REVENUECAT_API_KEY) {
          console.error('RevenueCat iOS API key missing from this EAS build.');
          setIsConfigured(false);
          return;
        }

        Purchases.setLogLevel(LOG_LEVEL.INFO);
        await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        console.log('✅ RevenueCat configured');
        setIsConfigured(true);

        // Connect authenticated users so purchases/restores are consistent across devices
        if (user?.id) {
          try {
            await Purchases.logIn(user.id);
            console.log('[IAP] RevenueCat user logged in:', user.id);
          } catch (loginError) {
            console.warn('[IAP] RevenueCat logIn failed (continuing anonymously):', loginError);
          }
        }

        // Verify offerings and report product availability
        try {
          const offerings = await Purchases.getOfferings();
          const current = offerings.current;
          console.log('[IAP] current offering:', current?.identifier ?? 'none');

          const availableIds = (current?.availablePackages ?? []).map(p => p.product.identifier);
          console.log('[IAP] package product IDs:', availableIds);

          const expectedIds = Object.values(IAP_PRODUCT_IDS);
          const missing = expectedIds.filter(id => !availableIds.includes(id));
          if (missing.length > 0) {
            console.warn('[IAP] missing expected products:', missing);
          } else {
            console.log('[IAP] all expected products present.');
          }
        } catch (offeringsError) {
          console.warn('[IAP] getOfferings failed:', offeringsError);
        }
      } catch (error) {
        console.error('❌ Failed to configure RevenueCat:', error);
        setIsConfigured(false);
      }
    };

    void configureRevenueCat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadEntitlements = useCallback(async () => {
    try {
      console.log('📦 Loading entitlements... isAuthenticated:', isAuthenticated, 'isDemoAccount:', isDemoAccount);
      
      if (isDemoAccount) {
        console.log('🎭 Demo account: Granting unlimited premium access');
        const premiumEntitlements: Entitlements = {
          credits: 1000,
          isPremium: true,
          premiumExpiresAt: null,
        };
        setEntitlements(premiumEntitlements);
        return;
      }
      
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('⚠️ Entitlements loading timeout');
          resolve(null);
        }, 1000);
      });
      
      const loadPromise = AsyncStorage.getItem(storageKey);
      const stored = await Promise.race([loadPromise, timeoutPromise]);
      
      if (stored && typeof stored === 'string') {
        try {
          const parsed = JSON.parse(stored) as Entitlements;
          console.log('✅ Loaded entitlements from storage:', parsed);
          setEntitlements(parsed);
        } catch (parseError) {
          console.error('❌ Error parsing entitlements:', parseError);
          setEntitlements(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
        }
      } else if (isAuthenticated) {
        console.log('✅ New authenticated user: Setting default credits to 10');
        setEntitlements(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
      } else {
        console.log('👤 No stored entitlements, using defaults');
        setEntitlements(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
      }
    } catch (error) {
      console.error('❌ Error loading entitlements:', error);
      setEntitlements(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
    }
  }, [isAuthenticated, isDemoAccount, storageKey]);

  useEffect(() => {
    setEntitlements(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
    entitlementsRef.current = DEFAULT_ENTITLEMENTS_AUTHENTICATED;
    loadEntitlements();
  }, [loadEntitlements, isAuthenticated, user?.id]);

  useEffect(() => {
    entitlementsRef.current = entitlements;
  }, [entitlements]);

  const saveEntitlements = useCallback(async (newEntitlements: Entitlements) => {
    try {
      // Update the live balance immediately so later credit operations use
      // the newest value instead of a stale React render.
      entitlementsRef.current = newEntitlements;
      setEntitlements(newEntitlements);

      await AsyncStorage.setItem(storageKey, JSON.stringify(newEntitlements));
      console.log('[IAP] Entitlements saved:', newEntitlements);
    } catch (error) {
      console.error('[IAP] Error saving entitlements:', error);
      throw error;
    }
  }, [storageKey]);

  const addCredits = useCallback(async (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const current = entitlementsRef.current;

    const newEntitlements = {
      ...current,
      credits: current.credits + amount,
    };

    await saveEntitlements(newEntitlements);
  }, [saveEntitlements]);

  const useCredit = useCallback(async (amount: number = 1) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      return false;
    }

    const normalizedAmount = Math.floor(amount);
    const current = entitlementsRef.current;

    if (current.credits < normalizedAmount) {
      return false;
    }

    const newEntitlements = {
      ...current,
      credits: current.credits - normalizedAmount,
    };

    await saveEntitlements(newEntitlements);
    return true;
  }, [saveEntitlements]);

  const setPremium = useCallback(async (expiresAt: number) => {
    const newEntitlements = {
      ...entitlementsRef.current,
      isPremium: true,
      premiumExpiresAt: expiresAt,
    };
    await saveEntitlements(newEntitlements);
  }, [entitlements, saveEntitlements]);

  const syncFromCustomerInfo = useCallback(async (customerInfo: CustomerInfo) => {
    const premiumEntitlement = getPremiumEntitlement(customerInfo);
    const premiumActive = !!premiumEntitlement;

    let expiresAt: number | null = null;
    const expirationRaw = premiumEntitlement?.expirationDate;
    if (expirationRaw) {
      const parsed = Date.parse(expirationRaw);
      if (!Number.isNaN(parsed)) {
        expiresAt = parsed;
      }
    }

    const merged: Entitlements = {
      ...entitlementsRef.current,
      isPremium: premiumActive,
      premiumExpiresAt: premiumActive ? expiresAt : null,
    };

    await saveEntitlements(merged);
  }, [getPremiumEntitlement, entitlements, saveEntitlements]);

  const purchase = useCallback(async (productId: IAPProductId) => {
    if (!isConfigured) {
      Alert.alert('Not Available', 'In-app purchases are not configured for this environment.');
      return;
    }

    try {
      setIsPurchasing(true);

      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current) {
        throw new Error('No current offering found');
      }

      const pkg = current.availablePackages.find((p: PurchasesPackage) => p.product.identifier === productId);
      if (!pkg) {
        throw new Error(`Product not found in current offering: ${productId}`);
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);

      let updated = { ...entitlementsRef.current };

      if (productId === IAP_PRODUCT_IDS.CREDITS_100) updated.credits += 100;
      if (productId === IAP_PRODUCT_IDS.CREDITS_500) updated.credits += 500;
      if (productId === IAP_PRODUCT_IDS.CREDITS_1000) updated.credits += 1000;

      const premiumEntitlement = getPremiumEntitlement(customerInfo);
      const premiumActive = !!premiumEntitlement;

      if (premiumActive) {
        const expirationRaw = premiumEntitlement?.expirationDate;
        const parsedExpiration = expirationRaw ? Date.parse(expirationRaw) : NaN;

        updated.isPremium = true;
        updated.premiumExpiresAt = Number.isNaN(parsedExpiration) ? null : parsedExpiration;
      }

      await saveEntitlements(updated);
      Alert.alert('Purchase Successful', 'Your purchase has been applied.');
    } catch (error: any) {
      if (error?.userCancelled) return;
      console.error('❌ Purchase failed:', error);
      Alert.alert('Purchase Failed', error?.message ?? 'Unable to complete purchase.');
    } finally {
      setIsPurchasing(false);
    }
  }, [getPremiumEntitlement, isConfigured, entitlements, saveEntitlements]);

  const restorePurchases = useCallback(async () => {
    if (!isConfigured) {
      Alert.alert('Not Available', 'Purchase restoration is not configured for this environment.');
      return;
    }

    try {
      setIsRestoring(true);
      const customerInfo = await Purchases.restorePurchases();

      const premiumEntitlement = getPremiumEntitlement(customerInfo);
      const premiumActive = !!premiumEntitlement;

      let expiresAt: number | null = null;
      const expirationRaw = premiumEntitlement?.expirationDate;
      if (expirationRaw) {
        const parsed = Date.parse(expirationRaw);
        if (!Number.isNaN(parsed)) {
          expiresAt = parsed;
        }
      }

      const restored: Entitlements = {
        ...entitlements,
        isPremium: premiumActive,
        premiumExpiresAt: premiumActive ? expiresAt : null,
      };

      await saveEntitlements(restored);
      Alert.alert('Restored', 'Purchases restored successfully.');
    } catch (error: any) {
      console.error('❌ Restore failed:', error);
      Alert.alert('Restore Failed', error?.message ?? 'Unable to restore purchases.');
    } finally {
      setIsRestoring(false);
    }
  }, [getPremiumEntitlement, isConfigured, entitlements, saveEntitlements]);

  const isPremiumActive = useMemo(() => {
    return entitlements.isPremium &&
      (entitlements.premiumExpiresAt === null || entitlements.premiumExpiresAt > Date.now());
  }, [entitlements.isPremium, entitlements.premiumExpiresAt]);

  useEffect(() => {
    if (!isConfigured || !isNative) return;

    const refreshRevenueCatEntitlements = async () => {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        await syncFromCustomerInfo(customerInfo);
      } catch (error) {
        console.warn('⚠️ Could not refresh RevenueCat entitlements:', error);
      }
    };

    void refreshRevenueCatEntitlements();
  }, [isConfigured, syncFromCustomerInfo]);

  const usageStats: UsageStats = useMemo(() => {
    return {
      credits: entitlements.credits,
      isAdFree: isPremiumActive,
      availableVoices: ALL_VOICES,
      canUseAI: entitlements.credits > 0,
    };
  }, [entitlements, isPremiumActive]);

  const canUseVoice = useCallback((voice: string): boolean => {
    return usageStats.availableVoices.includes(voice);
  }, [usageStats.availableVoices]);

  return useMemo(() => ({
    entitlements,
    usageStats,
    isPurchasing,
    isRestoring,
    purchase,
    restorePurchases,
    addCredits,
    useCredit,
    setPremium,
    canUseVoice,
    refreshEntitlements: loadEntitlements,
  }), [
    entitlements,
    usageStats,
    isPurchasing,
    isRestoring,
    purchase,
    restorePurchases,
    addCredits,
    useCredit,
    setPremium,
    canUseVoice,
    loadEntitlements,
  ]);
});
