import React, { useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity,
  Image,
  SafeAreaView,
  Animated,
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, Heart, Share2 } from 'lucide-react-native';
import { useSpeechContext } from '@/hooks/speech-context';
import { router } from 'expo-router';
import AudioOnlyVideoPlayer from '@/components/AudioOnlyVideoPlayer';
import type { AudioOnlyVideoPlayerRef } from '@/components/AudioOnlyVideoPlayer';
import { useTheme } from '@/hooks/theme-context';
import { useAdMob } from '@/hooks/admob-context';
import * as Haptics from 'expo-haptics';


export default function PlayerScreen() {
  const { colors } = useTheme();
  const { 
    currentSpeech, 
    toggleFavorite, 
    skipToNext, 
    skipToPrevious, 
    setIsMinimized,
    currentPlaylist,
    audioPlayerRef,
    setIsPlaying,
    setCurrentTime,
    setDuration,
  } = useSpeechContext();
  const { showInterstitialAd, canShowAds, tryShowInterstitialOnTransition } = useAdMob();
  const localPlayerRef = useRef<AudioOnlyVideoPlayerRef>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const midpointAdShownRef = useRef(false);
  const styles = getStyles(colors);

  useEffect(() => {
    setIsMinimized(false);
    return () => {
      audioPlayerRef.current = null;
    };
  }, [setIsMinimized, audioPlayerRef]);

  useEffect(() => {
    if (localPlayerRef.current) {
      audioPlayerRef.current = localPlayerRef.current;
    }
  }, [audioPlayerRef, currentSpeech]);

  const handleMinimize = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMinimized(true);
    router.back();
  };

  const handleNext = useCallback(() => {
    skipToNext();
  }, [skipToNext]);

  const handlePrevious = useCallback(() => {
    skipToPrevious();
  }, [skipToPrevious]);

  const handlePlayingChange = useCallback((playing: boolean) => {
    console.log('Player playing state changed:', playing);
    setIsPlaying(playing);
  }, [setIsPlaying]);

  const handleProgressChange = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    if (dur > 0) {
      setDuration(dur);
    }
  }, [setCurrentTime, setDuration]);

  const handleShare = async () => {
    if (!currentSpeech) return;
    try {
      const message = `Check out "${currentSpeech.title}" by ${currentSpeech.speaker} on Motivation Fuel!`;
      const url = currentSpeech.youtubeId 
        ? `https://youtube.com/watch?v=${currentSpeech.youtubeId}` 
        : undefined;
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: currentSpeech.title, text: message, url });
        }
      } else {
        await Share.share({ message, url });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.03,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  if (!currentSpeech) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(0,0,0,0.95)', '#000000', '#000000']}
        style={styles.gradientBackground}
      />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <TouchableOpacity onPress={handleMinimize} style={styles.closeButton}>
            <ChevronDown color="#FFFFFF" size={30} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NOW PLAYING</Text>
          <View style={styles.closeButton} />
        </Animated.View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {currentSpeech.youtubeId ? (
            <View style={styles.playerWrapper}>
              <AudioOnlyVideoPlayer
                ref={localPlayerRef}
                videoId={currentSpeech.youtubeId}
                title={currentSpeech.title}
                thumbnail={currentSpeech.youtubeId 
                  ? `https://i.ytimg.com/vi/${currentSpeech.youtubeId}/hqdefault.jpg`
                  : currentSpeech.imageUrl
                }
                channelTitle={currentSpeech.speaker}
                autoplay={true}
                onError={(error: string) => {
                  console.error('Audio playback error:', error);
                }}
                onEnd={async () => {
                  console.log('Audio playback ended');
                  midpointAdShownRef.current = false;
                  if (canShowAds) {
                    const shown = await tryShowInterstitialOnTransition();
                    if (shown) {
                      console.log('🎯 [Ad] Speech ended — showed interstitial (every 3 speeches)');
                    }
                  }
                  handleNext();
                }}
                onNext={currentPlaylist.length > 1 ? handleNext : undefined}
                onPrevious={currentPlaylist.length > 1 ? handlePrevious : undefined}
                onPlayingChange={handlePlayingChange}
                onProgressChange={(time: number, dur: number) => {
                  handleProgressChange(time, dur);
                  if (
                    canShowAds &&
                    !midpointAdShownRef.current &&
                    dur >= 300 &&
                    time >= dur * 0.5 &&
                    time < dur * 0.55
                  ) {
                    midpointAdShownRef.current = true;
                    console.log('🎯 [Ad] Midpoint reached on long speech — showing interstitial');
                    void showInterstitialAd();
                  }
                }}
              />
            </View>
          ) : (
            <>
              <Animated.View style={[styles.imageContainer, { transform: [{ scale: scaleAnim }] }]}>
                <Image source={{ uri: currentSpeech.imageUrl }} style={styles.image} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.4)']}
                  style={styles.imageGradient}
                />
              </Animated.View>
              
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>{currentSpeech.title}</Text>
                <Text style={styles.speaker}>{currentSpeech.speaker}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{(currentSpeech.category || '').toUpperCase()}</Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.bottomActions}>
            <TouchableOpacity 
              onPress={() => toggleFavorite(currentSpeech.id)} 
              style={[
                styles.actionButton,
                currentSpeech.isFavorite && styles.actionButtonActive,
              ]}
              activeOpacity={0.7}
            >
              <Heart 
                color={currentSpeech.isFavorite ? '#FF3B30' : 'rgba(255,255,255,0.8)'} 
                size={22} 
                fill={currentSpeech.isFavorite ? '#FF3B30' : 'transparent'}
                strokeWidth={currentSpeech.isFavorite ? 0 : 1.8}
              />
              <Text style={[
                styles.actionLabel,
                currentSpeech.isFavorite && styles.actionLabelActive,
              ]}>
                {currentSpeech.isFavorite ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7} onPress={handleShare}>
              <Share2 color="rgba(255,255,255,0.8)" size={22} strokeWidth={1.8} />
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (_colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  imageContainer: {
    width: '85%',
    aspectRatio: 1,
    maxWidth: 340,
    maxHeight: 340,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 48,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    position: 'relative',
    backgroundColor: '#1C1C1E',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',
  },
  info: {
    alignItems: 'center',
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 32,
  },
  speaker: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    opacity: 0.8,
    marginBottom: 16,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    opacity: 0.9,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    marginTop: 24,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    minWidth: 80,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(255,59,48,0.12)',
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  actionLabelActive: {
    color: '#FF3B30',
  },
});
