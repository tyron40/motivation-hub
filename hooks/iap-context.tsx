import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Alert, Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  PurchasesPackage,
  CustomerInfo,
} from "react-native-purchases";
import Constants from "expo-constants";
import { IAPProductId, ALL_VOICES, IAP_PRODUCT_IDS } from "@/constants/iap";
import { useAuth } from "./auth-context";
import { supabase } from "@/lib/supabase";

const isNative = Platform.OS === "ios" || Platform.OS === "android";

const REVENUECAT_API_KEY =
  Platform.OS === "ios"
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
  credits: 0,
  isPremium: false,
  premiumExpiresAt: null,
};

interface CreditWalletResult {
  initialized: boolean;
  balance: number | null;
  revision: number | null;
}

interface SpendCreditsResult {
  spent: boolean;
  duplicate: boolean;
  balance: number;
  revision: number;
}

function createRequestId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (character) => {
      const random = Math.floor(Math.random() * 16);
      const value = character === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    },
  );
}

export const [IAPProvider, useIAP] = createContextHook(() => {
  const { isAuthenticated, user } = useAuth();
  const storageKey = useMemo(
    () => `entitlements:${user?.id ?? "guest"}`,
    [user?.id],
  );
  const [entitlements, setEntitlements] = useState<Entitlements>(
    DEFAULT_ENTITLEMENTS_AUTHENTICATED,
  );
  const entitlementsRef = useRef<Entitlements>(
    DEFAULT_ENTITLEMENTS_AUTHENTICATED,
  );
  const spendQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const isDemoAccount = user?.email === "demo@motivationhub.app";

  // Helper to read the active premium entitlement, keeping compatibility for both 'premium' and 'Premium'
  const getPremiumEntitlement = useCallback((customerInfo: CustomerInfo) => {
    return (
      customerInfo.entitlements.active["premium"] ||
      customerInfo.entitlements.active["Premium"] ||
      null
    );
  }, []);

  useEffect(() => {
    const configureRevenueCat = async () => {
      try {
        console.log("[IAP Config]", {
          platform: Platform.OS,
          native: isNative,
          appOwnership: Constants.appOwnership,
          hasIOSKey: Boolean(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY),
          hasAndroidKey: Boolean(
            process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
          ),
        });

        if (!isNative) {
          console.log("?? RevenueCat disabled on web");
          setIsConfigured(false);
          return;
        }

        const appOwnership = Constants.appOwnership;
        if (appOwnership === "expo") {
          console.log("?? RevenueCat not available in Expo Go");
          setIsConfigured(false);
          return;
        }

        if (!REVENUECAT_API_KEY) {
          console.error("RevenueCat iOS API key missing from this EAS build.");
          setIsConfigured(false);
          return;
        }

        Purchases.setLogLevel(LOG_LEVEL.INFO);
        await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        console.log("? RevenueCat configured");
        setIsConfigured(true);

        // Connect authenticated users so purchases/restores are consistent across devices
        if (user?.id) {
          try {
            await Purchases.logIn(user.id);
            console.log("[IAP] RevenueCat user logged in:", user.id);
          } catch (loginError) {
            console.warn(
              "[IAP] RevenueCat logIn failed (continuing anonymously):",
              loginError,
            );
          }
        }

        // Verify offerings and report product availability
        try {
          const offerings = await Purchases.getOfferings();
          const current = offerings.current;
          console.log("[IAP] current offering:", current?.identifier ?? "none");

          const availableIds = (current?.availablePackages ?? []).map(
            (p) => p.product.identifier,
          );
          console.log("[IAP] package product IDs:", availableIds);

          const expectedIds = Object.values(IAP_PRODUCT_IDS);
          const missing = expectedIds.filter(
            (id) => !availableIds.includes(id),
          );
          if (missing.length > 0) {
            console.warn("[IAP] missing expected products:", missing);
          } else {
            console.log("[IAP] all expected products present.");
          }
        } catch (offeringsError) {
          console.warn("[IAP] getOfferings failed:", offeringsError);
        }
      } catch (error) {
        console.error("? Failed to configure RevenueCat:", error);
        setIsConfigured(false);
      }
    };

    void configureRevenueCat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadEntitlements = useCallback(async () => {
    if (isDemoAccount) {
      const demoEntitlements: Entitlements = {
        credits: 1000,
        isPremium: true,
        premiumExpiresAt: null,
      };
      entitlementsRef.current = demoEntitlements;
      setEntitlements(demoEntitlements);
      return;
    }

    if (!isAuthenticated || !user?.id) {
      entitlementsRef.current = DEFAULT_ENTITLEMENTS_AUTHENTICATED;
      setEntitlements(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
      return;
    }

    try {
      const stored = await AsyncStorage.getItem(storageKey);
      let cachedPremium: Pick<Entitlements, "isPremium" | "premiumExpiresAt"> =
        {
          isPremium: false,
          premiumExpiresAt: null,
        };

      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<Entitlements>;
          cachedPremium = {
            isPremium: parsed.isPremium === true,
            premiumExpiresAt:
              typeof parsed.premiumExpiresAt === "number"
                ? parsed.premiumExpiresAt
                : null,
          };
        } catch (error) {
          console.warn("[IAP] Ignoring invalid cached entitlements:", error);
        }
      }

      const { data, error } = await supabase.rpc("get_my_credit_wallet");
      if (error) throw error;

      const wallet = data as CreditWalletResult | null;
      if (!wallet?.initialized || !Number.isInteger(wallet.balance)) {
        throw new Error(
          "Credit wallet has not been initialized for this account.",
        );
      }

      const next: Entitlements = {
        credits: Math.max(0, wallet.balance as number),
        ...cachedPremium,
      };
      entitlementsRef.current = next;
      setEntitlements(next);
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    } catch (error) {
      console.error("[IAP] Unable to load the server credit wallet:", error);
      throw error;
    }
  }, [isAuthenticated, isDemoAccount, storageKey, user?.id]);

  useEffect(() => {
    setEntitlements(DEFAULT_ENTITLEMENTS_AUTHENTICATED);
    entitlementsRef.current = DEFAULT_ENTITLEMENTS_AUTHENTICATED;
    void loadEntitlements().catch((error) => {
      console.warn('[IAP] Initial wallet refresh failed:', error);
    });
  }, [loadEntitlements, isAuthenticated, user?.id]);

  useEffect(() => {
    entitlementsRef.current = entitlements;
  }, [entitlements]);

  const saveEntitlements = useCallback(
    async (newEntitlements: Entitlements) => {
      try {
        // Update the live balance immediately so later credit operations use
        // the newest value instead of a stale React render.
        entitlementsRef.current = newEntitlements;
        setEntitlements(newEntitlements);

        await AsyncStorage.setItem(storageKey, JSON.stringify(newEntitlements));
        console.log("[IAP] Entitlements saved:", newEntitlements);
      } catch (error) {
        console.error("[IAP] Error saving entitlements:", error);
        throw error;
      }
    },
    [storageKey],
  );

  const addCredits = useCallback(
    async (_amount: number) => {
      console.warn(
        "[IAP] Client credit grants are disabled. Refreshing the server wallet.",
      );
      await loadEntitlements();
    },
    [loadEntitlements],
  );

  const useCredit = useCallback(
    async (amount: number = 1) => {
      if (!Number.isFinite(amount) || amount <= 0 || !user?.id) {
        return false;
      }

      const normalizedAmount = Math.floor(amount);
      const requestId = createRequestId();
      const spend = async (): Promise<boolean> => {
        const { data, error } = await supabase.rpc("spend_my_credits", {
          p_amount: normalizedAmount,
          p_request_id: requestId,
        });
        if (error) throw error;

        const result = data as SpendCreditsResult | null;
        if (!result || !Number.isInteger(result.balance)) {
          throw new Error("Invalid credit-spend response.");
        }

        const next: Entitlements = {
          ...entitlementsRef.current,
          credits: Math.max(0, result.balance),
        };
        await saveEntitlements(next);
        return result.spent;
      };

      const task = spendQueueRef.current.catch(() => false).then(spend);
      spendQueueRef.current = task;
      return task;
    },
    [saveEntitlements, user?.id],
  );

  const setPremium = useCallback(
    async (expiresAt: number) => {
      const newEntitlements = {
        ...entitlementsRef.current,
        isPremium: true,
        premiumExpiresAt: expiresAt,
      };
      await saveEntitlements(newEntitlements);
    },
    [entitlements, saveEntitlements],
  );

  const syncFromCustomerInfo = useCallback(
    async (customerInfo: CustomerInfo) => {
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
    },
    [getPremiumEntitlement, saveEntitlements],
  );

  const purchase = useCallback(
    async (productId: IAPProductId) => {
      if (!isConfigured) {
        Alert.alert(
          "Not Available",
          "In-app purchases are not configured for this environment.",
        );
        return;
      }

      try {
        setIsPurchasing(true);

        const offerings = await Purchases.getOfferings();
        const current = offerings.current;
        if (!current) {
          throw new Error("No current offering found");
        }

        const pkg = current.availablePackages.find(
          (p: PurchasesPackage) => p.product.identifier === productId,
        );
        if (!pkg) {
          throw new Error(
            `Product not found in current offering: ${productId}`,
          );
        }

        const { customerInfo } = await Purchases.purchasePackage(pkg);

        const updated = { ...entitlementsRef.current };

        const premiumEntitlement = getPremiumEntitlement(customerInfo);
        const premiumActive = !!premiumEntitlement;

        if (premiumActive) {
          const expirationRaw = premiumEntitlement?.expirationDate;
          const parsedExpiration = expirationRaw
            ? Date.parse(expirationRaw)
            : NaN;

          updated.isPremium = true;
          updated.premiumExpiresAt = Number.isNaN(parsedExpiration)
            ? null
            : parsedExpiration;
        }

        await saveEntitlements(updated);

        if (productId.startsWith("mh_credits_")) {
          for (let attempt = 0; attempt < 5; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            try {
              await loadEntitlements();
            } catch (refreshError) {
              console.warn(
                '[IAP] Waiting for verified purchase credit:',
                refreshError
              );
            }

            if (entitlementsRef.current.credits > updated.credits) break;
          }
        }

        Alert.alert("Purchase Successful", "Your purchase has been applied.");
      } catch (error: any) {
        if (error?.userCancelled) return;
        console.error("? Purchase failed:", error);
        Alert.alert(
          "Purchase Failed",
          error?.message ?? "Unable to complete purchase.",
        );
      } finally {
        setIsPurchasing(false);
      }
    },
    [getPremiumEntitlement, isConfigured, loadEntitlements, saveEntitlements],
  );

  const restorePurchases = useCallback(async () => {
    if (!isConfigured) {
      Alert.alert(
        "Not Available",
        "Purchase restoration is not configured for this environment.",
      );
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
        ...entitlementsRef.current,
        isPremium: premiumActive,
        premiumExpiresAt: premiumActive ? expiresAt : null,
      };

      await saveEntitlements(restored);
      Alert.alert("Restored", "Purchases restored successfully.");
    } catch (error: any) {
      console.error("? Restore failed:", error);
      Alert.alert(
        "Restore Failed",
        error?.message ?? "Unable to restore purchases.",
      );
    } finally {
      setIsRestoring(false);
    }
  }, [getPremiumEntitlement, isConfigured, saveEntitlements]);

  const isPremiumActive = useMemo(() => {
    return (
      entitlements.isPremium &&
      (entitlements.premiumExpiresAt === null ||
        entitlements.premiumExpiresAt > Date.now())
    );
  }, [entitlements.isPremium, entitlements.premiumExpiresAt]);

  useEffect(() => {
    if (!isConfigured || !isNative) return;

    const refreshRevenueCatEntitlements = async () => {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        await syncFromCustomerInfo(customerInfo);
      } catch (error) {
        console.warn("?? Could not refresh RevenueCat entitlements:", error);
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

  const canUseVoice = useCallback(
    (voice: string): boolean => {
      return usageStats.availableVoices.includes(voice);
    },
    [usageStats.availableVoices],
  );

  return useMemo(
    () => ({
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
    }),
    [
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
    ],
  );
});
