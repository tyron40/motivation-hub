import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import { IAP_PRODUCT_IDS, IAPProductId, PREMIUM_VOICES, FREE_VOICES, FREE_TIER_LIMITS, CREDIT_COSTS } from '@/constants/iap';

interface Entitlements {
  credits: number;
  isPremium: boolean;
  premiumExpiresAt: number | null;
  dailyChatCount: number;
  dailyTTSCount: number;
  lastResetDate: string;
}

interface UsageStats {
  todayChats: number;
  todayTTS: number;
  canUseChat: boolean;
  canUseTTS: boolean;
  availableVoices: readonly string[];
}

const DEFAULT_ENTITLEMENTS: Entitlements = {
  credits: 0,
  isPremium: false,
  premiumExpiresAt: null,
  dailyChatCount: 0,
  dailyTTSCount: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
};

export const [IAPProvider, useIAP] = createContextHook(() => {
  const [entitlements, setEntitlements] = useState<Entitlements>(DEFAULT_ENTITLEMENTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const loadEntitlements = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('entitlements');
      if (stored) {
        const parsed = JSON.parse(stored) as Entitlements;
        const today = new Date().toISOString().split('T')[0];
        
        if (parsed.lastResetDate !== today) {
          parsed.dailyChatCount = 0;
          parsed.dailyTTSCount = 0;
          parsed.lastResetDate = today;
          await AsyncStorage.setItem('entitlements', JSON.stringify(parsed));
        }
        
        setEntitlements(parsed);
      }
    } catch (error) {
      console.error('❌ Error loading entitlements:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntitlements();
  }, [loadEntitlements]);

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

  const deductCredits = useCallback(async (amount: number): Promise<boolean> => {
    if (entitlements.isPremium) {
      return true;
    }
    
    if (entitlements.credits < amount) {
      return false;
    }
    
    const newEntitlements = {
      ...entitlements,
      credits: entitlements.credits - amount,
    };
    await saveEntitlements(newEntitlements);
    return true;
  }, [entitlements, saveEntitlements]);

  const incrementUsage = useCallback(async (type: 'chat' | 'tts') => {
    const today = new Date().toISOString().split('T')[0];
    const newEntitlements = {
      ...entitlements,
      dailyChatCount: type === 'chat' ? entitlements.dailyChatCount + 1 : entitlements.dailyChatCount,
      dailyTTSCount: type === 'tts' ? entitlements.dailyTTSCount + 1 : entitlements.dailyTTSCount,
      lastResetDate: today,
    };
    await saveEntitlements(newEntitlements);
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

      if (productId === IAP_PRODUCT_IDS.CREDITS_100) {
        await addCredits(100);
        Alert.alert('Success', '100 credits added to your account!');
      } else if (productId === IAP_PRODUCT_IDS.CREDITS_500) {
        await addCredits(500);
        Alert.alert('Success', '500 credits added to your account!');
      } else if (productId === IAP_PRODUCT_IDS.CREDITS_1000) {
        await addCredits(1000);
        Alert.alert('Success', '1000 credits added to your account!');
      } else if (productId === IAP_PRODUCT_IDS.PREMIUM_MONTHLY) {
        const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
        await setPremium(expiresAt);
        Alert.alert('Success', 'Premium subscription activated!');
      } else if (productId === IAP_PRODUCT_IDS.PREMIUM_ANNUAL) {
        const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
        await setPremium(expiresAt);
        Alert.alert('Success', 'Annual premium subscription activated!');
      }
      
      console.log('✅ Purchase completed:', productId);
    } catch (error) {
      console.error('❌ Purchase error:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Purchase Failed', error instanceof Error ? error.message : 'Unable to complete purchase. Please try again.');
      }
    } finally {
      setIsPurchasing(false);
    }
  }, [isPurchasing, addCredits, setPremium]);

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
      todayChats: entitlements.dailyChatCount,
      todayTTS: entitlements.dailyTTSCount,
      canUseChat: isPremiumActive || 
                   entitlements.dailyChatCount < FREE_TIER_LIMITS.DAILY_CHAT_MESSAGES ||
                   entitlements.credits >= CREDIT_COSTS.CHAT_MESSAGE,
      canUseTTS: isPremiumActive || 
                  entitlements.dailyTTSCount < FREE_TIER_LIMITS.DAILY_TTS_GENERATIONS ||
                  entitlements.credits >= CREDIT_COSTS.TTS_STANDARD,
      availableVoices: isPremiumActive ? [...FREE_VOICES, ...PREMIUM_VOICES] : FREE_VOICES,
    };
  }, [entitlements]);

  const canUseVoice = useCallback((voice: string): boolean => {
    return usageStats.availableVoices.includes(voice);
  }, [usageStats.availableVoices]);

  return useMemo(() => ({
    entitlements,
    usageStats,
    isLoading,
    isPurchasing,
    isRestoring,
    purchase,
    restorePurchases,
    addCredits,
    deductCredits,
    incrementUsage,
    canUseVoice,
    refreshEntitlements: loadEntitlements,
  }), [
    entitlements,
    usageStats,
    isLoading,
    isPurchasing,
    isRestoring,
    purchase,
    restorePurchases,
    addCredits,
    deductCredits,
    incrementUsage,
    canUseVoice,
    loadEntitlements,
  ]);
});
