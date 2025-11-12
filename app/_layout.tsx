import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { SpeechProvider, useSpeechContext } from "@/hooks/speech-context";
import { UserProfileProvider } from "@/hooks/user-profile-context";
import { AuthProvider, useAuth } from "@/hooks/auth-context";
import { PlaylistProvider } from "@/hooks/playlist-context";
import { ScriptureFavoritesProvider } from "@/hooks/scripture-favorites-context";
import { ChatSessionsProvider } from "@/hooks/chat-sessions-context";
import { IAPProvider } from "@/hooks/iap-context";
import { ThemeProvider } from "@/hooks/theme-context";
import { AudioPlayer } from '@/components/AudioPlayer';
import { getWorkingAudioUrl } from '@/services/speechService';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingScreen } from '@/components/LoadingScreen';

// Prevent splash screen from auto-hiding with error handling
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch((error) => {
    console.warn('Failed to prevent splash screen auto-hide:', error);
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});



function AudioPlayerWrapper() {
  const [audioUrl, setAudioUrl] = React.useState<string>('');
  const [isLoadingAudio, setIsLoadingAudio] = React.useState(false);
  
  // Always call hooks at the top level
  const speechContext = useSpeechContext();

  // Get audio URL when speech changes
  React.useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    
    const loadAudioUrl = async () => {
      if (!speechContext) {
        console.warn('AudioPlayerWrapper: Speech context not available');
        return;
      }

      const { currentSpeech, handleAudioError } = speechContext;
      
      if (currentSpeech && typeof currentSpeech === 'object' && currentSpeech.title) {
        // Skip YouTube videos - they should use AudioOnlyVideoPlayer in the player screen
        if (currentSpeech.youtubeId) {
          console.log('🎵 Skipping global AudioPlayer for YouTube video:', currentSpeech.title);
          setAudioUrl('');
          setIsLoadingAudio(false);
          return;
        }
        
        // Only handle speeches with actual audio URLs (podcasts, etc.)
        if (!currentSpeech.audioUrl) {
          console.log('🎵 No audioUrl found for speech:', currentSpeech.title);
          setAudioUrl('');
          setIsLoadingAudio(false);
          return;
        }
        
        try {
          setIsLoadingAudio(true);
          console.log('🎵 Loading audio URL for global player:', currentSpeech.title);
          
          // Add timeout to prevent hanging
          timeoutId = setTimeout(() => {
            if (isMounted) {
              console.warn('⚠️ Audio URL loading timeout');
              setIsLoadingAudio(false);
              handleAudioError?.('Audio loading timeout');
            }
          }, 10000);
          
          const url = await getWorkingAudioUrl(currentSpeech);
          
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          if (isMounted && url && typeof url === 'string' && url.trim().length > 0) {
            console.log('✅ Setting audio URL for global player:', url);
            setAudioUrl(url);
          } else {
            console.warn('⚠️ Invalid audio URL received:', url);
            setAudioUrl('');
          }
        } catch (error) {
          console.error('❌ Error loading audio URL:', error);
          if (isMounted && handleAudioError) {
            handleAudioError('Failed to load audio');
          }
        } finally {
          if (isMounted) {
            setIsLoadingAudio(false);
          }
        }
      } else {
        // Clear audio URL when no speech is selected
        setAudioUrl('');
        setIsLoadingAudio(false);
      }
    };
    
    loadAudioUrl();
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [speechContext?.currentSpeech, speechContext?.handleAudioError]);

  // Safety checks after hooks
  if (!speechContext) {
    console.warn('AudioPlayerWrapper: Speech context not available');
    return null;
  }

  const { currentSpeech, isPlaying, handlePlaybackStatusUpdate, handleAudioError, audioPlayerRef } = speechContext;

  // Don't render AudioPlayer for YouTube videos or if no valid audio URL
  if (!audioUrl || 
      !currentSpeech || 
      isLoadingAudio || 
      currentSpeech.youtubeId || // Skip YouTube videos
      typeof audioUrl !== 'string' || 
      audioUrl.trim().length === 0) {
    return null;
  }

  return (
    <AudioPlayer
      ref={audioPlayerRef}
      audioUrl={audioUrl}
      isPlaying={isPlaying}
      onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      onError={handleAudioError}
    />
  );
}

function RootLayoutNav() {
  const { isAuthenticated, isLoading, isGuest } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Loading your motivational coach..." />;
  }

  const canAccessApp = isAuthenticated || isGuest;

  return (
    <>
      <Stack screenOptions={{ 
        headerShown: false,
        headerBackTitle: "Back",
        headerStyle: {
          backgroundColor: '#1A1A2E',
        },
        headerTintColor: '#FFFFFF',
      }}>
        {canAccessApp ? (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen 
              name="player" 
              options={{ 
                presentation: 'modal',
                headerShown: false,
              }} 
            />
            <Stack.Screen 
              name="category/[id]" 
              options={{ 
                title: 'Category',
                headerShown: true,
              }} 
            />
            <Stack.Screen 
              name="voice-coach" 
              options={{ 
                presentation: 'modal',
                headerShown: false,
              }} 
            />
            <Stack.Screen 
              name="settings" 
              options={{ 
                title: 'Settings',
                headerShown: true,
              }} 
            />
            <Stack.Screen 
              name="videos" 
              options={{ 
                title: 'Videos',
                headerShown: true,
              }} 
            />
            <Stack.Screen 
              name="video-player" 
              options={{ 
                presentation: 'modal',
                headerShown: false,
              }} 
            />
            <Stack.Screen 
              name="playlists" 
              options={{ 
                title: 'My Playlists',
                headerShown: true,
              }} 
            />
            <Stack.Screen 
              name="coach-character" 
              options={{ 
                title: 'Choose Your Coach',
                presentation: 'modal',
                headerShown: true,
              }} 
            />
          </>
        ) : (
          <Stack.Screen 
            name="auth" 
            options={{ 
              headerShown: false,
              gestureEnabled: false,
            }} 
          />
        )}
      </Stack>
      {canAccessApp && <AudioPlayerWrapper />}
    </>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = React.useState(false);
  const [initError, setInitError] = React.useState<string | null>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const prepare = async () => {
      try {
        console.log('🚀 Starting app initialization...');
        
        // Set ready immediately to prevent hydration timeout
        setIsReady(true);
        
        // Hide splash screen after a short delay
        timeoutId = setTimeout(() => {
          if (Platform.OS !== 'web') {
            SplashScreen.hideAsync().catch((splashError) => {
              console.warn('⚠️ Failed to hide splash screen:', splashError);
            });
          }
        }, 500);
        
        console.log('✅ App initialization completed');
      } catch (error) {
        console.error('❌ Error during app initialization:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
        setIsReady(true);
        
        if (Platform.OS !== 'web') {
          SplashScreen.hideAsync().catch((splashError) => {
            console.warn('⚠️ Failed to hide splash screen after error:', splashError);
          });
        }
      }
    };

    prepare();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (!isReady) {
    return null;
  }

  if (initError) {
    console.warn('⚠️ App started with initialization error:', initError);
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AuthProvider>
                <IAPProvider>
                  <UserProfileProvider>
                    <PlaylistProvider>
                      <ScriptureFavoritesProvider>
                        <ChatSessionsProvider>
                          <SpeechProvider>
                            <RootLayoutNav />
                          </SpeechProvider>
                        </ChatSessionsProvider>
                      </ScriptureFavoritesProvider>
                    </PlaylistProvider>
                  </UserProfileProvider>
                </IAPProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});