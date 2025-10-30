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
          
          // Clear invalid session if refresh token error
          if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
            console.log('🔐 Clearing invalid session due to refresh token error');
            await auth.clearSession();
          }
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
        
        // Clear session on any auth error
        try {
          await auth.clearSession();
        } catch (clearError) {
          console.error('❌ Error clearing session:', clearError);
        }
        
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
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.email || 'no user');
      
      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log('🔐 Token refresh failed, clearing session');
        await auth.clearSession();
      }
      
      // Handle signed out state
      if (event === 'SIGNED_OUT') {
        console.log('🔐 User signed out');
        await auth.clearSession();
      }
      
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
      
      // Check for demo account
      if (email.toLowerCase() === 'demo@motivationhub.app' && password === 'Demo2025!') {
        console.log('🎭 Demo account detected - granting full access');
        
        // Create a mock demo user
        const demoUser = {
          id: 'demo-user-id',
          email: 'demo@motivationhub.app',
          user_metadata: { name: 'Demo User' },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as any;
        
        const demoSession = {
          access_token: 'demo-token',
          refresh_token: 'demo-refresh',
          user: demoUser,
          expires_at: Date.now() + 86400000, // 24 hours
        } as any;
        
        setAuthState({
          user: demoUser,
          session: demoSession,
          isLoading: false,
          isAuthenticated: true,
          isGuest: false,
        });
        
        console.log('✅ Demo user signed in successfully');
        return { error: null, isDemo: true };
      }
      
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
      
      // Check if it's a demo user - just clear local state
      if (authState.user?.email === 'demo@motivationhub.app') {
        console.log('🎭 Signing out demo user');
        setAuthState({
          user: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
          isGuest: false,
        });
        console.log('✅ Demo user signed out successfully');
        return { error: null };
      }
      
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
  }, [authState.user]);

  const refreshSession = useCallback(async () => {
    try {
      console.log('🔐 Refreshing session...');
      const { data: { session }, error } = await auth.getSession();
      
      if (error) {
        console.error('❌ Error refreshing session:', error);
        
        // Clear invalid session if refresh token error
        if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
          console.log('🔐 Clearing invalid session due to refresh token error');
          await auth.clearSession();
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            isGuest: false,
          });
        }
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
      
      // Clear session on any error
      try {
        await auth.clearSession();
      } catch (clearError) {
        console.error('❌ Error clearing session:', clearError);
      }
      
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        isGuest: false,
      });
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