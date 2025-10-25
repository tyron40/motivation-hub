import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, userData?: { name?: string }) => Promise<{ error?: any }>;
  signOut: () => Promise<{ error?: any }>;
  continueAsGuest: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    isGuest: false,
  });

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing authentication...');
        
        // Race between getting session and timeout
        const sessionPromise = auth.getSession();
        const timeoutPromise = new Promise<null>((resolve) => {
          timeoutId = setTimeout(() => {
            console.warn('⚠️ Auth initialization timeout, proceeding without session');
            resolve(null);
          }, 3000);
        });
        
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (timeoutId) clearTimeout(timeoutId);
        
        const { data: { session } = { session: null }, error } = result || { data: { session: null } };
        
        if (error) {
          console.error('❌ Error getting session:', error);
        }

        if (isMounted) {
          setAuthState({
            user: session?.user || null,
            session: session || null,
            isLoading: false,
            isAuthenticated: !!session?.user,
            isGuest: false,
          });
          
          if (session?.user) {
            console.log('✅ User authenticated:', session.user.email);
          } else {
            console.log('👤 No authenticated user');
          }
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (isMounted) {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            isGuest: false,
          });
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.email || 'no user');
      
      if (isMounted) {
        setAuthState({
          user: session?.user || null,
          session: session || null,
          isLoading: false,
          isAuthenticated: !!session?.user,
          isGuest: false,
        });
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      console.log('🔐 Signing in user:', email);
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        console.error('❌ Sign in error:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { error };
      }
      
      console.log('✅ User signed in successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Sign in exception:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, userData?: { name?: string }) => {
    try {
      console.log('🔐 Signing up user:', email);
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const { data, error } = await auth.signUp(email, password, userData);
      
      if (error) {
        console.error('❌ Sign up error:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { error };
      }
      
      console.log('✅ User signed up successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Sign up exception:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('🔐 Signing out user');
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const { error } = await auth.signOut();
      
      if (error) {
        console.error('❌ Sign out error:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { error };
      }
      
      console.log('✅ User signed out successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Sign out exception:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { error };
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      console.log('🔐 Refreshing session...');
      const { data: { session }, error } = await auth.getSession();
      
      if (error) {
        console.error('❌ Error refreshing session:', error);
        return;
      }
      
      setAuthState({
        user: session?.user || null,
        session: session || null,
        isLoading: false,
        isAuthenticated: !!session?.user,
        isGuest: false,
      });
      
      console.log('✅ Session refreshed');
    } catch (error) {
      console.error('❌ Exception refreshing session:', error);
    }
  }, []);

  const continueAsGuest = useCallback(async () => {
    try {
      console.log('👤 Continuing as guest');
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: true,
        isGuest: true,
      });
      console.log('✅ Guest session started');
    } catch (error) {
      console.error('❌ Error starting guest session:', error);
    }
  }, []);

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    continueAsGuest,
    refreshSession,
  } as AuthState & AuthActions;
});