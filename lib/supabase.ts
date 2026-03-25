import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vncaboqllcykibwdnmwp.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuY2Fib3FsbGN5a2lid2RubXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzAzNTgsImV4cCI6MjA3NDMwNjM1OH0.QbPby5rAKpStXuXE9safH5bQy3VzmFg16nWJHCX9tnA';

// Create storage adapter for React Native
const createStorageAdapter = () => {
  if (Platform.OS === 'web') {
    // Use localStorage for web
    return {
      getItem: (key: string) => {
        if (typeof window !== 'undefined') {
          return window.localStorage.getItem(key);
        }
        return null;
      },
      setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, value);
        }
      },
      removeItem: (key: string) => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(key);
        }
      },
    };
  } else {
    // Use AsyncStorage for React Native
    return {
      getItem: (key: string) => AsyncStorage.getItem(key),
      setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
      removeItem: (key: string) => AsyncStorage.removeItem(key),
    };
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'motivation-hub-app',
    },
  },
});

let isClearing = false;

// Add global error handler for refresh token errors
supabase.auth.onAuthStateChange(async (event, session) => {
  if ((event === 'TOKEN_REFRESHED' && !session) || event === 'SIGNED_OUT') {
    if (!isClearing) {
      isClearing = true;
      console.warn('⚠️ Token refresh failed or signed out, clearing invalid session');
      try {
        const storage = createStorageAdapter();
        const keysToRemove = [
          `sb-${supabaseUrl.split('//')[1]?.split('.')[0] || 'supabase'}-auth-token`,
          'supabase.auth.token',
        ];
        for (const key of keysToRemove) {
          await storage.removeItem(key);
        }
      } catch (error) {
        console.error('❌ Error clearing session:', error);
      } finally {
        isClearing = false;
      }
    }
  }
});

// Helper functions for authentication
export const auth = {
  signUp: async (email: string, password: string, userData?: { name?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getCurrentUser: () => {
    return supabase.auth.getUser();
  },

  getSession: () => {
    return supabase.auth.getSession();
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },

  clearSession: async () => {
    try {
      console.log('🔐 Clearing stored session...');
      
      const storage = createStorageAdapter();
      
      // Clear all Supabase auth keys from storage
      const keysToRemove = [
        `sb-${supabaseUrl.split('//')[1]?.split('.')[0] || 'supabase'}-auth-token`,
        'supabase.auth.token',
        `sb-vncaboqllcykibwdnmwp-auth-token`,
      ];
      
      for (const key of keysToRemove) {
        try {
          await storage.removeItem(key);
          console.log(`✅ Removed ${key}`);
        } catch (err) {
          console.warn(`⚠️ Could not remove ${key}:`, err);
        }
      }
      
      console.log('✅ Session cleared from storage');
    } catch (error) {
      console.error('❌ Error clearing session storage:', error);
    }
  },

  checkAndClearInvalidTokens: async () => {
    try {
      const storage = createStorageAdapter();
      const tokenKey = `sb-vncaboqllcykibwdnmwp-auth-token`;
      const tokenData = await storage.getItem(tokenKey);
      
      if (tokenData) {
        try {
          const parsed = JSON.parse(tokenData);
          const expiresAt = parsed?.expires_at || 0;
          
          // Check if token is expired
          if (expiresAt && expiresAt * 1000 < Date.now()) {
            console.log('🔐 Found expired token, clearing...');
            await storage.removeItem(tokenKey);
          }
        } catch (parseError) {
          console.warn('⚠️ Could not parse token data, clearing:', parseError);
          await storage.removeItem(tokenKey);
        }
      }
    } catch (error) {
      console.warn('⚠️ Error checking tokens:', error);
    }
  },
};

export default supabase;