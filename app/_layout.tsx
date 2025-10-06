import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from '@/lib/trpc';
import { SpeechProvider, useSpeechContext } from "@/hooks/speech-context";
import { UserProfileProvider } from "@/hooks/user-profile-context";
import { AuthProvider, useAuth } from "@/hooks/auth-context";
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
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Loading your motivational coach..." />;
  }

  return (
    <>
      <Stack screenOptions={{ 
        headerBackTitle: "Back",
        headerStyle: {
          backgroundColor: '#1A1A2E',
        },
        headerTintColor: '#FFFFFF',
      }}>
        {isAuthenticated ? (
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
              }} 
            />
            <Stack.Screen 
              name="videos" 
              options={{ 
                title: 'Videos',
              }} 
            />
            <Stack.Screen 
              name="video-player" 
              options={{ 
                presentation: 'modal',
                headerShown: false,
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
      {isAuthenticated && <AudioPlayerWrapper />}
    </>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = React.useState(false);
  const [initError, setInitError] = React.useState<string | null>(null);

  useEffect(() => {
    const prepare = async () => {
      try {
        console.log('🚀 Starting app initialization...');
        
        // Add any initialization logic here with timeout
        const initPromise = new Promise(resolve => setTimeout(resolve, 100));
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initialization timeout')), 5000)
        );
        
        await Promise.race([initPromise, timeoutPromise]);
        
        console.log('✅ App initialization completed');
        setIsReady(true);
        
        // Hide splash screen after app is ready
        if (Platform.OS !== 'web') {
          try {
            await SplashScreen.hideAsync();
            console.log('✅ Splash screen hidden');
          } catch (splashError) {
            console.warn('⚠️ Failed to hide splash screen:', splashError);
          }
        }
      } catch (error) {
        console.error('❌ Error during app initialization:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
        setIsReady(true); // Still show the app even if there's an error
        
        if (Platform.OS !== 'web') {
          SplashScreen.hideAsync().catch((splashError) => {
            console.warn('⚠️ Failed to hide splash screen after error:', splashError);
          });
        }
      }
    };

    prepare();
  }, []);

  if (!isReady) {
    return <LoadingScreen message="Initializing your motivational coach..." />;
  }

  if (initError) {
    console.warn('⚠️ App started with initialization error:', initError);
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
              <ErrorBoundary>
                <AuthProvider>
                  <ErrorBoundary>
                    <UserProfileProvider>
                      <ErrorBoundary>
                        <SpeechProvider>
                          <RootLayoutNav />
                        </SpeechProvider>
                      </ErrorBoundary>
                    </UserProfileProvider>
                  </ErrorBoundary>
                </AuthProvider>
              </ErrorBoundary>
            </QueryClientProvider>
          </trpc.Provider>
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