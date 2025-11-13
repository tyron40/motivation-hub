import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { IAPProductId, ALL_VOICES } from '@/constants/iap';
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
  const [isConfigured, setIsConfigured] = useState(false);
  const [availablePackages, setAvailablePackages] = useState<PurchasesPackage[]>([]);
  const [isSandbox, setIsSandbox] = useState(false);
  
  // Check if current user is demo account
  const isDemoAccount = user?.email === 'demo@motivationhub.app';

  // Configure RevenueCat
  useEffect(() => {
    const configure = async () => {
      if (isWeb) {
        console.log('⚠️ RevenueCat not available on web');
        setIsConfigured(true);
        return;
      }

      try {
        console.log('🔧 Configuring RevenueCat...');
        
        const apiKey = Platform.select({
          ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '',
          android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '',
          default: '',
        });

        if (!apiKey) {
          console.warn('⚠️ RevenueCat API key not configured');
          console.log('ℹ️ IAP features will be disabled in this environment');
          setIsConfigured(true);
          return;
        }

        // Check if we're in a sandbox environment (Rork preview, Expo Go, etc.)
        const sandboxMode = __DEV__ && (apiKey.startsWith('appl_') || apiKey.startsWith('goog_'));
        
        if (sandboxMode) {
          console.log('ℹ️ Running in sandbox environment with production API key');
          console.log('ℹ️ IAP features will be disabled - this is expected');
          console.log('ℹ️ Use RevenueCat Test Store API key for testing, or production build for native IAP');
          setIsSandbox(true);
          setIsConfigured(true);
          return;
        }

        await Purchases.configure({ apiKey, useAmazon: false });
        console.log('✅ RevenueCat configured successfully');
        
        // Set user ID if authenticated
        if (isAuthenticated && user?.id) {
          await Purchases.logIn(user.id);
          console.log('✅ RevenueCat user logged in:', user.id);
        }

        // Get available offerings
        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          setAvailablePackages(offerings.current.availablePackages);
          console.log('✅ Available packages:', offerings.current.availablePackages.length);
        }

        setIsConfigured(true);
      } catch (error: any) {
        // Check if it's the Rork sandbox error
        if (error?.message?.includes('native store is not available') || 
            error?.message?.includes('Invalid API key') ||
            error?.message?.includes('Test Store API Key')) {
          console.log('ℹ️ Running in sandbox - RevenueCat features disabled');
          console.log('ℹ️ This is expected in Rork preview/Expo Go');
          console.log('ℹ️ IAP will work in production builds');
          setIsSandbox(true);
        } else {
          console.error('❌ Error configuring RevenueCat:', error);
          console.error('Error message:', error?.message);
        }
        
        setIsConfigured(true);
      }
    };

    configure();
  }, [isAuthenticated, user?.id]);

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

  // Process customer info from RevenueCat
  const processCustomerInfo = useCallback(async (customerInfo: CustomerInfo) => {
    try {
      console.log('📦 Processing customer info...');
      
      // Check for active premium subscription
      const hasPremium = customerInfo.entitlements.active['premium'] !== undefined;
      const premiumExpiry = hasPremium 
        ? new Date(customerInfo.entitlements.active['premium'].expirationDate || '').getTime()
        : null;
      
      // Check for purchased credits (non-consumables stored as entitlements)
      let totalCredits = entitlements.credits;
      
      // For credit purchases, we'll need to implement a custom solution
      // since RevenueCat doesn't directly track consumables
      // This would typically involve your backend tracking credit balance
      
      const newEntitlements: Entitlements = {
        credits: totalCredits,
        isPremium: hasPremium,
        premiumExpiresAt: premiumExpiry,
      };
      
      await saveEntitlements(newEntitlements);
      console.log('✅ Customer info processed:', newEntitlements);
    } catch (error) {
      console.error('❌ Error processing customer info:', error);
    }
  }, [entitlements, saveEntitlements]);

  const purchase = useCallback(async (productId: IAPProductId) => {
    console.log('🎯 Purchase button tapped! Product ID:', productId);
    console.log('📊 State check:', {
      isPurchasing,
      isWeb,
      isAuthenticated,
      isConfigured,
      availablePackagesCount: availablePackages.length
    });

    if (isPurchasing) {
      console.warn('⚠️ Purchase already in progress');
      Alert.alert('Please Wait', 'A purchase is already in progress.');
      return;
    }

    if (isWeb) {
      console.warn('⚠️ In-app purchases are not available on web');
      Alert.alert('Not Available', 'In-app purchases are only available on mobile.');
      return;
    }

    if (!isAuthenticated) {
      console.log('❌ User not authenticated');
      Alert.alert('Account Required', 'Please sign in to make purchases.');
      return;
    }

    if (!isConfigured) {
      console.log('❌ RevenueCat not configured');
      Alert.alert('Not Ready', 'Payment system is still loading. Please try again in a moment.');
      return;
    }

    if (isSandbox) {
      console.log('ℹ️ Cannot purchase in sandbox mode');
      Alert.alert(
        'Sandbox Mode',
        'In-app purchases are not available in the Rork preview environment. This feature will work in production builds.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (availablePackages.length === 0) {
      console.log('❌ No packages available');
      Alert.alert('Products Unavailable', 'Unable to load products. Please check your connection and try again.');
      return;
    }

    setIsPurchasing(true);
    
    try {
      console.log('🛒 Starting purchase for:', productId);
      console.log('📦 Available packages:', availablePackages.map(p => p.product.identifier));

      // Find the package that matches the product ID
      const pkg = availablePackages.find(p => p.product.identifier === productId);
      
      if (!pkg) {
        console.log('❌ Product not found in available packages');
        console.log('Looking for:', productId);
        console.log('Available:', availablePackages.map(p => p.product.identifier));
        throw new Error(`Product ${productId} not found. Available: ${availablePackages.map(p => p.product.identifier).join(', ')}`);
      }

      console.log('💳 Making purchase with RevenueCat...');
      console.log('Package details:', {
        identifier: pkg.identifier,
        productId: pkg.product.identifier,
        price: pkg.product.priceString
      });
      
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      
      // Process the purchase and update entitlements
      await processCustomerInfo(customerInfo);
      
      Alert.alert(
        'Purchase Complete',
        'Thank you for your purchase! Your account has been updated.',
        [{ text: 'OK' }]
      );
      
      console.log('✅ Purchase completed successfully');
    } catch (error: any) {
      console.error('❌ Purchase error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      if (error.userCancelled) {
        console.log('ℹ️ User cancelled purchase');
        return;
      }
      
      Alert.alert(
        'Purchase Failed', 
        error?.message || 'Unable to complete purchase. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsPurchasing(false);
    }
  }, [isPurchasing, isAuthenticated, isConfigured, availablePackages, processCustomerInfo]);

  const restorePurchases = useCallback(async () => {
    if (isRestoring) {
      console.warn('⚠️ Restore already in progress');
      return;
    }

    if (isWeb) {
      console.warn('⚠️ Purchase restoration is not available on web');
      return;
    }

    if (!isAuthenticated) {
      Alert.alert('Account Required', 'Please sign in to restore purchases.');
      return;
    }

    setIsRestoring(true);
    
    try {
      console.log('🔄 Restoring purchases...');

      if (!isConfigured) {
        throw new Error('Payment system not ready. Please try again in a moment.');
      }

      const customerInfo = await Purchases.restorePurchases();
      await processCustomerInfo(customerInfo);
      
      Alert.alert(
        'Restore Complete', 
        'Your purchases have been restored successfully.',
        [{ text: 'OK' }]
      );
      
      console.log('✅ Restore completed');
    } catch (error: any) {
      console.error('❌ Restore error:', error);
      
      Alert.alert(
        'Restore Failed', 
        error?.message || 'Unable to restore purchases. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRestoring(false);
    }
  }, [isRestoring, isAuthenticated, isConfigured, processCustomerInfo]);

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
    isSandbox,
    isConfigured,
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
    isSandbox,
    isConfigured,
  ]);
});
