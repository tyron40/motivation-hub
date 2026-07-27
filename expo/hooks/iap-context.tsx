import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import { IAPProductId, ALL_VOICES, IAP_PRODUCTS } from '@/constants/iap';
import { useAuth } from './auth-context';

const isWeb = Platform.OS === 'web';

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

interface PurchaseRecord {
  productId: IAPProductId;
  purchasedAt: number;
  credits?: number;
  isPremium?: boolean;
  expiresAt?: number | null;
}

const DEFAULT_ENTITLEMENTS_AUTHENTICATED: Entitlements = {
  credits: 10,
  isPremium: false,
  premiumExpiresAt: null,
};

/**
 * Local IAP implementation that works without native RevenueCat SDK.
 * Purchases are simulated locally — credits and premium status are
 * granted immediately and persisted to AsyncStorage so the app fully
 * functions end-to-end.
 */
export const [IAPProvider, useIAP] = createContextHook(() => {
  const { isAuthenticated, user } = useAuth();
  const storageKey = useMemo(() => `entitlements:${user?.id ?? 'guest'}`, [user?.id]);
  const purchasesKey = useMemo(() => `purchases:${user?.id ?? 'guest'}`, [user?.id]);
  const [entitlements, setEntitlements] = useState<Entitlements>(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);

  const isDemoAccount = user?.email === 'demo@motivationhub.app';

  const loadEntitlements = useCallback(async () => {
    try {
      if (isDemoAccount) {
        const premiumEntitlements: Entitlements = {
          credits: 1000,
          isPremium: true,
          premiumExpiresAt: null,
        };
        setEntitlements(premiumEntitlements);
        return;
      }

      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Entitlements;
        // Check premium expiry
        if (parsed.isPremium && parsed.premiumExpiresAt && parsed.premiumExpiresAt < Date.now()) {
          parsed.isPremium = false;
          parsed.premiumExpiresAt = null;
        }
        setEntitlements(parsed);
      } else if (isAuthenticated) {
        setEntitlements(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
      } else {
        setEntitlements(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
      }
    } catch (error) {
      console.error('❌ Error loading entitlements:', error);
      setEntitlements(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
    }
  }, [isAuthenticated, isDemoAccount, storageKey]);

  useEffect(() => {
    setEntitlements(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
    loadEntitlements();
  }, [loadEntitlements, isAuthenticated, user?.id]);

  const saveEntitlements = useCallback(async (newEntitlements: Entitlements) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newEntitlements));
      setEntitlements(newEntitlements);
    } catch (error) {
      console.error('❌ Error saving entitlements:', error);
    }
  }, [storageKey]);

  const recordPurchase = useCallback(async (record: PurchaseRecord) => {
    try {
      const stored = await AsyncStorage.getItem(purchasesKey);
      const purchases: PurchaseRecord[] = stored ? JSON.parse(stored) : [];
      purchases.push(record);
      await AsyncStorage.setItem(purchasesKey, JSON.stringify(purchases));
    } catch (error) {
      console.error('❌ Error recording purchase:', error);
    }
  }, [purchasesKey]);

  const addCredits = useCallback(async (amount: number) => {
    const newEntitlements = {
      ...entitlements,
      credits: entitlements.credits + amount,
    };
    await saveEntitlements(newEntitlements);
  }, [entitlements, saveEntitlements]);

  const useCredit = useCallback(async () => {
    if (entitlements.credits <= 0) {
      return false;
    }
    const newEntitlements = {
      ...entitlements,
      credits: entitlements.credits - 1,
    };
    await saveEntitlements(newEntitlements);
    return true;
  }, [entitlements, saveEntitlements]);

  const setPremium = useCallback(async (expiresAt: number) => {
    const newEntitlements = {
      ...entitlements,
      isPremium: true,
      premiumExpiresAt: expiresAt,
    };
    await saveEntitlements(newEntitlements);
  }, [entitlements, saveEntitlements]);

  const purchase = useCallback(async (productId: IAPProductId) => {
    if (!isAuthenticated) {
      Alert.alert('Account Required', 'Please sign in to make purchases.');
      return;
    }

    const product = IAP_PRODUCTS.find(p => p.productId === productId);
    if (!product) {
      Alert.alert('Error', 'Product not found.');
      return;
    }

    try {
      setIsPurchasing(true);

      // Simulate purchase processing
      await new Promise(resolve => setTimeout(resolve, 800));

      let updated = { ...entitlements };

      if (product.credits) {
        updated.credits += product.credits;
      }

      if (product.isPremium) {
        const now = Date.now();
        if (productId === 'mh_premium_monthly') {
          updated.isPremium = true;
          updated.premiumExpiresAt = now + (30 * 24 * 60 * 60 * 1000);
        } else if (productId === 'mh_premium_annual') {
          updated.isPremium = true;
          updated.premiumExpiresAt = now + (365 * 24 * 60 * 60 * 1000);
        }
      }

      await saveEntitlements(updated);
      await recordPurchase({
        productId,
        purchasedAt: Date.now(),
        credits: product.credits,
        isPremium: product.isPremium,
        expiresAt: updated.premiumExpiresAt,
      });

      Alert.alert(
        'Purchase Successful! 🎉',
        product.isPremium
          ? 'You now have Premium access. Enjoy an ad-free experience!'
          : `You've purchased ${product.credits} AI credits. Happy chatting!`
      );
    } catch (error: any) {
      console.error('❌ Purchase failed:', error);
      Alert.alert('Purchase Failed', error?.message ?? 'Unable to complete purchase.');
    } finally {
      setIsPurchasing(false);
    }
  }, [isAuthenticated, entitlements, saveEntitlements, recordPurchase]);

  const restorePurchases = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert('Account Required', 'Please sign in to restore purchases.');
      return;
    }

    try {
      setIsRestoring(true);

      const stored = await AsyncStorage.getItem(purchasesKey);
      const purchases: PurchaseRecord[] = stored ? JSON.parse(stored) : [];

      if (purchases.length === 0) {
        Alert.alert('No Purchases Found', 'There are no purchases to restore for this account.');
        return;
      }

      // Rebuild entitlements from purchase history
      let totalCredits = DEFAULT_ENTITLEMENTS_AUTHENTICATED.credits;
      let isPremium = false;
      let premiumExpiresAt: number | null = null;

      for (const record of purchases) {
        if (record.credits) {
          totalCredits += record.credits;
        }
        if (record.isPremium && record.expiresAt && record.expiresAt > Date.now()) {
          isPremium = true;
          premiumExpiresAt = record.expiresAt;
        }
      }

      const restored: Entitlements = {
        credits: totalCredits,
        isPremium,
        premiumExpiresAt,
      };

      await saveEntitlements(restored);
      Alert.alert('Purchases Restored! ✅', `Restored ${purchases.length} purchase(s).`);
    } catch (error: any) {
      console.error('❌ Restore failed:', error);
      Alert.alert('Restore Failed', error?.message ?? 'Unable to restore purchases.');
    } finally {
      setIsRestoring(false);
    }
  }, [isAuthenticated, purchasesKey, saveEntitlements]);

  const usageStats: UsageStats = useMemo(() => {
    const isPremiumActive = entitlements.isPremium &&
      (entitlements.premiumExpiresAt === null || entitlements.premiumExpiresAt > Date.now());

    return {
      credits: entitlements.credits,
      isAdFree: isPremiumActive,
      availableVoices: ALL_VOICES,
      canUseAI: entitlements.credits > 0,
    };
  }, [entitlements]);

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
