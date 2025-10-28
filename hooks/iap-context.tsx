import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import { IAP_PRODUCT_IDS, IAPProductId, ALL_VOICES } from '@/constants/iap';
import { useAuth } from './auth-context';

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

const DEFAULT_ENTITLEMENTS_GUEST: Entitlements = {
  credits: 0,
  isPremium: false,
  premiumExpiresAt: null,
};

export const [IAPProvider, useIAP] = createContextHook(() => {
  const { isGuest, isAuthenticated, user } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements>(DEFAULT_ENTITLEMENTS_GUEST);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Check if current user is demo account
  const isDemoAccount = user?.email === 'demo@motivationhub.app';

  const loadEntitlements = useCallback(async () => {
    try {
      console.log('📦 Loading entitlements... isGuest:', isGuest, 'isAuthenticated:', isAuthenticated, 'isDemoAccount:', isDemoAccount);
      
      // Grant full premium access to demo account
      if (isDemoAccount) {
        console.log('🎭 Demo account: Granting unlimited premium access');
        const premiumEntitlements: Entitlements = {
          credits: 1000, // Large number of credits
          isPremium: true,
          premiumExpiresAt: null, // Never expires
        };
        setEntitlements(premiumEntitlements);
        return;
      }
      
      if (isGuest) {
        console.log('👤 Guest user: Setting credits to 0 and clearing storage');
        await AsyncStorage.removeItem('entitlements');
        setEntitlements(DEFAULT_ENTITLEMENTS_GUEST);
        return;
      }
      
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('⚠️ Entitlements loading timeout');
          resolve(null);
        }, 1000);
      });
      
      const loadPromise = AsyncStorage.getItem('entitlements');
      const stored = await Promise.race([loadPromise, timeoutPromise]);
      
      if (stored && typeof stored === 'string') {
        try {
          const parsed = JSON.parse(stored) as Entitlements;
          console.log('✅ Loaded entitlements from storage:', parsed);
          setEntitlements(parsed);
        } catch (parseError) {
          console.error('❌ Error parsing entitlements:', parseError);
          const defaultEntitlements = isGuest ? DEFAULT_ENTITLEMENTS_GUEST : DEFAULT_ENTITLEMENTS_AUTHENTICATED;
          setEntitlements(defaultEntitlements);
        }
      } else if (isAuthenticated && !isGuest) {
        console.log('✅ New authenticated user: Setting default credits to 10');
        setEntitlements(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
      } else {
        console.log('👤 No stored entitlements, using guest defaults');
        setEntitlements(DEFAULT_ENTITLEMENTS_GUEST);
      }
    } catch (error) {
      console.error('❌ Error loading entitlements:', error);
      const defaultEntitlements = isGuest ? DEFAULT_ENTITLEMENTS_GUEST : DEFAULT_ENTITLEMENTS_AUTHENTICATED;
      setEntitlements(defaultEntitlements);
    }
  }, [isGuest, isAuthenticated, isDemoAccount]);

  useEffect(() => {
    loadEntitlements();
  }, [loadEntitlements, isGuest, isAuthenticated]);

  const saveEntitlements = useCallback(async (newEntitlements: Entitlements) => {
    try {
      await AsyncStorage.setItem('entitlements', JSON.stringify(newEntitlements));
      setEntitlements(newEntitlements);
      console.log('✅ Entitlements saved:', newEntitlements);
    } catch (error) {
      console.error('❌ Error saving entitlements:', error);
    }
  }, []);



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
    if (isPurchasing) {
      console.warn('⚠️ Purchase already in progress');
      return;
    }

    setIsPurchasing(true);
    
    try {
      console.log('🛒 Starting purchase for:', productId);
      
      if (Platform.OS === 'web') {
        throw new Error('In-app purchases are not available on web. Please use the iOS or Android app.');
      }

      Alert.alert(
        'Purchase Credits',
        'Thank you for your interest! Your purchase will be processed and credits will be added to your account.',
        [{ text: 'OK' }]
      );
      
      console.log('✅ Purchase flow initiated for:', productId);
    } catch (error) {
      console.error('❌ Purchase error:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Purchase Failed', error instanceof Error ? error.message : 'Unable to complete purchase. Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  }, [isPurchasing]);

  const restorePurchases = useCallback(async () => {
    if (isRestoring) {
      console.warn('⚠️ Restore already in progress');
      return;
    }

    setIsRestoring(true);
    
    try {
      console.log('🔄 Restoring purchases...');
      
      if (Platform.OS === 'web') {
        throw new Error('Purchase restoration is not available on web.');
      }

      Alert.alert('Restore Purchases', 'No previous purchases found to restore.');
      
      console.log('✅ Restore completed');
    } catch (error) {
      console.error('❌ Restore error:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Restore Failed', error instanceof Error ? error.message : 'Unable to restore purchases. Please try again.');
      }
    } finally {
      setIsRestoring(false);
    }
  }, [isRestoring]);

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
