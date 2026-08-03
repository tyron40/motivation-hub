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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, Heart, Share2, Play, Pause, SkipForward, SkipBack, RotateCcw, RotateCw } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useSpeechContext } from '@/hooks/speech-context';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/theme-context';
import * as Haptics from 'expo-haptics';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const coverSize = Math.min(width - 80, 280);

export default function PlayerScreen() {
  const { colors: _colors } = useTheme();
  const { 
    currentSpeech, 
    toggleFavorite, 
    skipToNext, 
    skipToPrevious, 
    setIsMinimized,
    currentPlaylist,
    audioPlayerRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    duration,
    setCurrentTime,
    setDuration,
  } = useSpeechContext();

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const styles = getStyles();

  useEffect(() => {
    setIsMinimized(false);
    return () => {
      // Do NOT clear audioPlayerRef here — GlobalYouTubePlayer owns it now
    };
  }, [setIsMinimized]);

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

  // Pulse animation for playing state
  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [isPlaying, pulseAnim]);

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

  const handlePlayPause = useCallback(() => {
    console.log('[Playback Trace] Player screen button pressed');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[Playback Trace] Global player ref exists:', !!audioPlayerRef.current);
    if (audioPlayerRef.current?.togglePlay) {
      audioPlayerRef.current.togglePlay();
    } else {
      console.warn('[Playback Trace] audioPlayerRef.current or togglePlay missing!');
    }
  }, [audioPlayerRef]);

  const handleSkipForward = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    audioPlayerRef.current?.seekForward(15);
  }, [audioPlayerRef]);

  const handleSkipBackward = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    audioPlayerRef.current?.seekBackward(15);
  }, [audioPlayerRef]);

  const handleSliderChange = useCallback((value: number) => {
    setCurrentTime(value);
  }, [setCurrentTime]);

  const handleSliderComplete = useCallback(async (value: number) => {
    await audioPlayerRef.current?.seekTo(value);
    setCurrentTime(value);
  }, [audioPlayerRef, setCurrentTime]);

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

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentSpeech) {
    return null;
  }

  const thumbnailUrl = currentSpeech.youtubeId
    ? `https://i.ytimg.com/vi/${currentSpeech.youtubeId}/hqdefault.jpg`
    : currentSpeech.imageUrl;

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
          {/* Cover image with pulse animation */}
          <Animated.View style={[styles.coverImageContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Image source={{ uri: thumbnailUrl }} style={styles.coverImage} />
            <View style={styles.coverGradient}>
              {isPlaying && (
                <View style={styles.nowPlayingIndicator}>
                  <View style={[styles.soundBar, styles.soundBar1]} />
                  <View style={[styles.soundBar, styles.soundBar2]} />
                  <View style={[styles.soundBar, styles.soundBar3]} />
                  <View style={[styles.soundBar, styles.soundBar4]} />
                </View>
              )}
            </View>
          </Animated.View>

          {/* Title and speaker */}
          <View style={styles.infoSection}>
            <Text style={styles.title} numberOfLines={2}>{currentSpeech.title}</Text>
            <Text style={styles.subtitle}>{currentSpeech.speaker}</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 1}
              value={currentTime}
              onValueChange={handleSliderChange}
              onSlidingStart={() => {}}
              onSlidingComplete={handleSliderComplete}
              minimumTrackTintColor="#667eea"
              maximumTrackTintColor="rgba(255,255,255,0.2)"
              thumbTintColor="#FFFFFF"
            />
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatDuration(currentTime)}</Text>
              <Text style={styles.timeText}>{formatDuration(duration)}</Text>
            </View>
          </View>

          {/* Playback controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              onPress={handlePrevious}
              style={[styles.navButton, currentPlaylist.length <= 1 && styles.buttonDisabled]}
              disabled={currentPlaylist.length <= 1}
              activeOpacity={0.7}
            >
              <SkipBack size={22} color="#FFFFFF" fill="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void handleSkipBackward()}
              style={styles.seekButton}
              activeOpacity={0.7}
            >
              <RotateCcw size={20} color="#FFFFFF" />
              <Text style={styles.seekLabel}>15</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPressIn={() => console.log('[Playback Trace] physical press detected')}
              onPress={handlePlayPause}
              style={styles.playButton}
              activeOpacity={0.8}
            >
              {isPlaying ? (
                <Pause size={32} color="#000000" fill="#000000" />
              ) : (
                <Play size={32} color="#000000" fill="#000000" style={{ marginLeft: 3 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void handleSkipForward()}
              style={styles.seekButton}
              activeOpacity={0.7}
            >
              <RotateCw size={20} color="#FFFFFF" />
              <Text style={styles.seekLabel}>15</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              style={[styles.navButton, currentPlaylist.length <= 1 && styles.buttonDisabled]}
              disabled={currentPlaylist.length <= 1}
              activeOpacity={0.7}
            >
              <SkipForward size={22} color="#FFFFFF" fill="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Bottom actions */}
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

const getStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradientBackground: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  coverImageContainer: {
    width: coverSize,
    height: coverSize,
    borderRadius: 24,
    overflow: 'hidden' as const,
    marginBottom: 32,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    backgroundColor: '#1C1C1E',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  nowPlayingIndicator: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: 3,
    height: 20,
  },
  soundBar: {
    width: 3,
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  soundBar1: { height: 8 },
  soundBar2: { height: 16 },
  soundBar3: { height: 12 },
  soundBar4: { height: 18 },
  infoSection: {
    width: '100%',
    alignItems: 'center' as const,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  progressSection: {
    width: '100%',
    marginBottom: 24,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 4,
    marginTop: -8,
  },
  timeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500' as const,
  },
  controls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 16,
    marginBottom: 24,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  seekButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginHorizontal: 4,
    elevation: 10,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  seekLabel: {
    position: 'absolute' as const,
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '800' as const,
    bottom: 6,
    letterSpacing: -0.3,
  },
  bottomActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 40,
    marginTop: 24,
  },
  actionButton: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
