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
import { AdMobProvider } from "@/hooks/admob-context";
import { AdminProvider } from "@/hooks/admin-context";
import { AudioPlayer } from '@/components/AudioPlayer';
import { getWorkingAudioUrl } from '@/services/speechService';
import type { Speech } from '@/types/speech';
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
        console.log('🎵 Skipping global AudioPlayer for YouTube video:', currentSpeechTitle);
        setAudioUrl('');
        setIsLoadingAudio(false);
        return;
      }

      if (!currentSpeechAudioUrl) {
        console.log('🎵 No audioUrl found for speech:', currentSpeechTitle);
        setAudioUrl('');
        setIsLoadingAudio(false);
        return;
      }

      try {
        setIsLoadingAudio(true);
        console.log('🎵 Loading audio URL for global player:', currentSpeechTitle);

        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('⚠️ Audio URL loading timeout');
            setIsLoadingAudio(false);
            handleAudioErrorRef.current?.('Audio loading timeout');
          }
        }, 10000);

        const speechForUrl = { id: currentSpeechId, title: currentSpeechTitle, audioUrl: currentSpeechAudioUrl } as Speech;
        const url = await getWorkingAudioUrl(speechForUrl);

        if (timeoutId) clearTimeout(timeoutId);

        if (isMounted && url && typeof url === 'string' && url.trim().length > 0) {
          console.log('✅ Setting audio URL for global player:', url);
          setAudioUrl(url);
        } else {
          console.warn('⚠️ Invalid audio URL received:', url);
          setAudioUrl('');
        }
      } catch (error) {
        console.error('❌ Error loading audio URL:', error);
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

  if (isLoading) {
    return <LoadingScreen message="Loading your motivational coach..." />;
  }

  const canAccessApp = isAuthenticated;

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
            console.log('🔊 Background audio mode configured');
          } catch (audioErr) {
            console.warn('⚠️ Failed to set audio mode:', audioErr);
          }
        }
        
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

    void prepare();
    
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