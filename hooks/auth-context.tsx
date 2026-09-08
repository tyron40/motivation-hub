import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, userData?: { name?: string }) => Promise<{ error?: any }>;
  signOut: () => Promise<{ error?: any }>;
  refreshSession: () => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing authentication...');
        
        await auth.checkAndClearInvalidTokens();
        
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
          if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token') || error.message?.includes('Invalid') || error.status === 401) {
            console.log('🔐 Clearing expired/invalid session');
            await auth.clearSession();
          } else {
            console.error('❌ Error getting session:', error);
          }
        }

        if (session?.user) {
          // Fast path: trust the locally cached session immediately so the
          // native splash never waits on a network user lookup. Server-side
          // validation continues in the background and corrects the visible
          // state as soon as it resolves (no close/reopen required).
          if (isMounted) {
            setAuthState({
              user: session.user,
              session,
              isLoading: false,
              isAuthenticated: true,
            });
            console.log('✅ User authenticated (cached session):', session.user.email);
          }

          void (async () => {
            try {
              const { data: { user }, error: userError } = await auth.getCurrentUser();
              if (!isMounted) return;
              if (userError || !user) {
                console.log('🔐 Session exists but user validation failed, clearing session');
                await auth.clearSession();
                if (isMounted) {
                  setAuthState({
                    user: null,
                    session: null,
                    isLoading: false,
                    isAuthenticated: false,
                  });
                }
              }
            } catch (validateError) {
              // A network hiccup during validation is NOT proof of an invalid
              // session — keep the cached session; the auth state listener
              // corrects it if it is genuinely invalid.
              console.log('🔐 Could not validate user (background) - keeping cached session');
            }
          })();

          return;
        }

        if (isMounted) {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
          });
          console.log('👤 No authenticated user - redirecting to login');
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        
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
          });
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, session?.user?.email || 'no user');
      
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log('🔐 Token refresh failed, clearing session');
        await auth.clearSession();
      }
      
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
      // The auth screen owns the sign-in loading UI. Keep the root navigator visible.
      
      if (email.toLowerCase() === 'demo@motivationhub.app' && password === 'Demo2025!') {
        console.log('🎭 Demo account detected - granting full access');
        
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
          expires_at: Date.now() + 86400000,
        } as any;
        
        setAuthState({
          user: demoUser,
          session: demoSession,
          isLoading: false,
          isAuthenticated: true,
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

      // signInWithPassword already returns the authenticated session.
      // Use it immediately instead of performing a second session lookup.
      const session = data?.session ?? null;

      if (session?.user) {
        setAuthState({
          user: session.user,
          session,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        // Never leave the root navigation stuck in its auth-loading state.
        setAuthState(prev => ({ ...prev, isLoading: false }));
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
      
      // The auth screen owns the signup loading UI. Keep the root navigator visible.
      const { error } = await auth.signUp(email, password, userData);
      
      if (error) {
        console.error('❌ Sign up error:', error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { error };
      }
      
      // Signup may succeed without an authenticated session when email verification is required.
      setAuthState(prev => ({ ...prev, isLoading: false }));

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
      const isDemoUser = authState.user?.email === 'demo@motivationhub.app';

      // Update React immediately so protected UI disappears without waiting on the network.
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });

      // Clear persisted credentials locally before returning to the auth screen.
      await auth.clearSession();

      if (isDemoUser) {
        console.log('🎭 Signing out demo user');
      } else {
        // Remote revocation must not block navigation to the login screen.
        void auth.signOut().catch((signOutError) => {
          console.warn('⚠️ Supabase signOut error after local sign out:', signOutError);
        });
      }
      
      console.log('✅ User signed out successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Sign out exception:', error);
      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return { error: null };
    }
  }, [authState.user]);

  const refreshSession = useCallback(async () => {
    try {
      console.log('🔐 Refreshing session...');
      const { data: { session }, error } = await auth.getSession();
      
      if (error) {
        console.error('❌ Error refreshing session:', error);
        
        if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
          console.log('🔐 Clearing invalid session due to refresh token error');
          await auth.clearSession();
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
        return;
      }
      
      setAuthState({
        user: session?.user || null,
        session: session || null,
        isLoading: false,
        isAuthenticated: !!session?.user,
      });
      
      console.log('✅ Session refreshed');
    } catch (error) {
      console.error('❌ Exception refreshing session:', error);
      
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
      });
    }
  }, []);

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    refreshSession,
  } as AuthState & AuthActions;
});
