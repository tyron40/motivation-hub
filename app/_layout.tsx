import { Stack, Redirect } from "expo-router";
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
import { AdMobProvider } from "@/hooks/admob-context";
import { AdminProvider } from "@/hooks/admin-context";
import { AudioPlayer } from '@/components/AudioPlayer';
import GlobalYouTubePlayer from '@/components/GlobalYouTubePlayer';
import { getWorkingAudioUrl } from '@/services/speechService';
import { YouTubeContentManager } from '@/services/YouTubeContentManager';
import type { Speech } from '@/types/speech';
import { ErrorBoundary } from '@/components/ErrorBoundary';


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
  
  const speechContext = useSpeechContext();
  const currentSpeech = speechContext?.currentSpeech ?? null;
  const isPlaying = speechContext?.isPlaying ?? false;
  const handlePlaybackStatusUpdate = speechContext?.handlePlaybackStatusUpdate;
  const handleAudioError = speechContext?.handleAudioError;
  const audioPlayerRef = speechContext?.audioPlayerRef;

  const handleAudioErrorRef = React.useRef(handleAudioError);
  React.useEffect(() => { handleAudioErrorRef.current = handleAudioError; }, [handleAudioError]);

  const currentSpeechId = currentSpeech?.id ?? null;
  const currentSpeechYoutubeId = currentSpeech?.youtubeId;
  const currentSpeechAudioUrl = currentSpeech?.audioUrl;
  const currentSpeechTitle = currentSpeech?.title;

  React.useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const loadAudioUrl = async () => {
      if (!currentSpeechId || !currentSpeechTitle) {
        setAudioUrl('');
        setIsLoadingAudio(false);
        return;
      }

      if (currentSpeechYoutubeId) {
        console.log('ðŸŽµ Skipping global AudioPlayer for YouTube video:', currentSpeechTitle);
        setAudioUrl('');
        setIsLoadingAudio(false);
        return;
      }

      if (!currentSpeechAudioUrl) {
        console.log('ðŸŽµ No audioUrl found for speech:', currentSpeechTitle);
        setAudioUrl('');
        setIsLoadingAudio(false);
        return;
      }

      try {
        setIsLoadingAudio(true);
        console.log('ðŸŽµ Loading audio URL for global player:', currentSpeechTitle);

        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('âš ï¸ Audio URL loading timeout');
            setIsLoadingAudio(false);
            handleAudioErrorRef.current?.('Audio loading timeout');
          }
        }, 10000);

        const speechForUrl = { id: currentSpeechId, title: currentSpeechTitle, audioUrl: currentSpeechAudioUrl } as Speech;
        const url = await getWorkingAudioUrl(speechForUrl);

        if (timeoutId) clearTimeout(timeoutId);

        if (isMounted && url && typeof url === 'string' && url.trim().length > 0) {
          console.log('âœ… Setting audio URL for global player:', url);
          setAudioUrl(url);
        } else {
          console.warn('âš ï¸ Invalid audio URL received:', url);
          setAudioUrl('');
        }
      } catch (error) {
        console.error('âŒ Error loading audio URL:', error);
        if (isMounted) {
          handleAudioErrorRef.current?.('Failed to load audio');
        }
      } finally {
        if (isMounted) {
          setIsLoadingAudio(false);
        }
      }
    };

    void loadAudioUrl();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentSpeechId, currentSpeechYoutubeId, currentSpeechAudioUrl, currentSpeechTitle]);

  if (!speechContext || !audioUrl || !currentSpeech || isLoadingAudio ||
      currentSpeech.youtubeId || typeof audioUrl !== 'string' || audioUrl.trim().length === 0) {
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

  // Keep the real native splash visible until auth initialization finishes.
  useEffect(() => {
    if (isLoading || Platform.OS === 'web') {
      return;
    }

    void SplashScreen.hideAsync().catch((error) => {
      console.warn('Failed to hide native splash:', error);
    });
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="auth" 
          options={{ 
            headerShown: false,
            gestureEnabled: false,
          }} 
        />
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
          name="church-motivation" 
          options={{ 
            title: 'Church Motivation',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="flyers" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="short-clips" 
          options={{ 
            headerShown: false,
          }} 
        />
      </Stack>
      {isAuthenticated && <AudioPlayerWrapper />}
      {isAuthenticated && <GlobalYouTubePlayer />}
    </>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = React.useState(false);
  const [initError, setInitError] = React.useState<string | null>(null);

  useEffect(() => {
    
    const prepare = async () => {
      try {
        console.log('ðŸš€ Starting app initialization...');
        
        if (Platform.OS !== 'web') {
          try {
            const { Audio } = require('expo-av');
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              staysActiveInBackground: true,
              playsInSilentModeIOS: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
            });
            console.log('ðŸ”Š Background audio mode configured');
          } catch (audioErr) {
            console.warn('âš ï¸ Failed to set audio mode:', audioErr);
          }
        }
        
        setIsReady(true);

        // Keep startup interactive while live YouTube category caches warm
        // in the background for faster category opening.
        void (async () => {
          const startupCategories = [
            'Motivation',
            'Success',
            'Mindset',
            'Fitness',
            'Study',
            'Christian Motivation',
            'Athlete Pump Up',
          ];

          for (const startupCategory of startupCategories) {
            try {
              await YouTubeContentManager.getVideosForCategory(
                startupCategory,
                40
              );
            } catch (error) {
              console.warn(
                `[YouTube Prewarm] ${startupCategory} failed`,
                error
              );
            }

            // Stagger requests so all category searches do not hit the
            // shared YouTube quota pools at the same instant.
            await new Promise(resolve => setTimeout(resolve, 750));
          }
        })();
        
        
        console.log('âœ… App initialization completed');
      } catch (error) {
        console.error('âŒ Error during app initialization:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
        setIsReady(true);
        
        if (Platform.OS !== 'web') {
          SplashScreen.hideAsync().catch((splashError) => {
            console.warn('âš ï¸ Failed to hide splash screen after error:', splashError);
          });
        }
      }
    };

    void prepare();
    
  }, []);

  if (!isReady) {
    return null;
  }

  if (initError) {
    console.warn('âš ï¸ App started with initialization error:', initError);
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AuthProvider>
                <IAPProvider>
                  <AdMobProvider>
                    <UserProfileProvider>
                    <AdminProvider>
                    <PlaylistProvider>
                      <ScriptureFavoritesProvider>
                        <ChatSessionsProvider>
                          <SpeechProvider>
                            <RootLayoutNav />
                          </SpeechProvider>
                        </ChatSessionsProvider>
                      </ScriptureFavoritesProvider>
                    </PlaylistProvider>
                    </AdminProvider>
                    </UserProfileProvider>
                  </AdMobProvider>
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