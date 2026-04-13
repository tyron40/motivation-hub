import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import { IAPProductId, ALL_VOICES, IAP_PRODUCT_IDS } from '@/constants/iap';
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

const DEFAULT_ENTITLEMENTS_AUTHENTICATED: Entitlements = {
  credits: 10,
  isPremium: false,
  premiumExpiresAt: null,
};

export const [IAPProvider, useIAP] = createContextHook(() => {
  const { isAuthenticated, user } = useAuth();
  const storageKey = useMemo(() => `entitlements:${user?.id ?? 'guest'}`, [user?.id]);
  const [entitlements, setEntitlements] = useState<Entitlements>(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const isDemoAccount = user?.email === 'demo@motivationhub.app';

  useEffect(() => {
    console.log('⚠️ RevenueCat not available in Expo Go - IAP features disabled');
    setIsConfigured(true);
  }, []);

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
    loadEntitlements();
  }, [loadEntitlements, isAuthenticated, user?.id]);

  const saveEntitlements = useCallback(async (newEntitlements: Entitlements) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newEntitlements));
      setEntitlements(newEntitlements);
      console.log('✅ Entitlements saved:', newEntitlements);
    } catch (error) {
      console.error('❌ Error saving entitlements:', error);
    }
  }, [storageKey]);

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
    console.log('⚠️ In-app purchases not available in Expo Go');
    Alert.alert('Not Available', 'In-app purchases are only available in production builds.');
  }, []);

  const restorePurchases = useCallback(async () => {
    console.log('⚠️ Purchase restoration not available in Expo Go');
    Alert.alert('Not Available', 'Purchase restoration is only available in production builds.');
  }, []);

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
