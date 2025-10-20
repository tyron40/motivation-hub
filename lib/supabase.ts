import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vncaboqllcykibwdnmwp.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuY2Fib3FsbGN5a2lid2RubXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzAzNTgsImV4cCI6MjA3NDMwNjM1OH0.QbPby5rAKpStXuXE9safH5bQy3VzmFg16nWJHCX9tnA';

console.log('🔧 Supabase Configuration:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length || 0,
  platform: Platform.OS,
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration!');
  throw new Error('Supabase URL and Anon Key are required');
}

const createStorageAdapter = () => {
  if (Platform.OS === 'web') {
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
  },
  global: {
    headers: {
      'X-Client-Info': `motivation-hub-${Platform.OS}`,
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const auth = {
  signUp: async (email: string, password: string, userData?: { name?: string }) => {
    try {
      console.log('🔐 [Supabase] Attempting sign up for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: undefined,
        },
      });
      
      if (error) {
        console.error('❌ [Supabase] Sign up error:', error.message);
        return { data, error };
      }
      
      console.log('✅ [Supabase] Sign up successful');
      return { data, error: null };
    } catch (error: any) {
      console.error('❌ [Supabase] Sign up exception:', error);
      return { 
        data: null, 
        error: { 
          message: error?.message || 'Network error. Please check your connection and try again.',
          status: 0,
        } 
      };
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      console.log('🔐 [Supabase] Attempting sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ [Supabase] Sign in error:', error.message);
        return { data, error };
      }
      
      console.log('✅ [Supabase] Sign in successful');
      return { data, error: null };
    } catch (error: any) {
      console.error('❌ [Supabase] Sign in exception:', error);
      return { 
        data: null, 
        error: { 
          message: error?.message || 'Network error. Please check your connection and try again.',
          status: 0,
        } 
      };
    }
  },

  signOut: async () => {
    try {
      console.log('🔐 [Supabase] Attempting sign out');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ [Supabase] Sign out error:', error.message);
        return { error };
      }
      
      console.log('✅ [Supabase] Sign out successful');
      return { error: null };
    } catch (error: any) {
      console.error('❌ [Supabase] Sign out exception:', error);
      return { 
        error: { 
          message: error?.message || 'Network error during sign out.',
          status: 0,
        } 
      };
    }
  },

  getCurrentUser: async () => {
    try {
      const result = await supabase.auth.getUser();
      return result;
    } catch (error: any) {
      console.error('❌ [Supabase] Get user exception:', error);
      return { 
        data: { user: null }, 
        error: { message: 'Failed to get current user' } 
      };
    }
  },

  getSession: async () => {
    try {
      const result = await supabase.auth.getSession();
      return result;
    } catch (error: any) {
      console.error('❌ [Supabase] Get session exception:', error);
      return { 
        data: { session: null }, 
        error: { message: 'Failed to get session' } 
      };
    }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default supabase;