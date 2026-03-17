import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Play, Pause, SkipForward, X, ChevronUp } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { useSpeechContext } from '@/hooks/speech-context';
import { useTheme } from '@/hooks/theme-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width: _SCREEN_WIDTH } = Dimensions.get('window');

export default function MiniPlayer() {
  const {
    currentSpeech,
    isPlaying,
    playPause,
    skipToNext,
    setCurrentSpeech,
    isMinimized,
    setIsMinimized,
    currentPlaylist,
  } = useSpeechContext();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const isOnPlayerScreen = pathname === '/player';
  const shouldShow = currentSpeech && isMinimized && !isOnPlayerScreen;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: shouldShow ? 0 : 100,
      friction: 12,
      tension: 65,
      useNativeDriver: true,
    }).start();
  }, [shouldShow, slideAnim]);

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        })
      ).start();
    } else {
      progressAnim.stopAnimation();
    }
  }, [isPlaying, progressAnim]);

  if (!currentSpeech) return null;

  const thumbnailUrl = currentSpeech.youtubeId
    ? `https://i.ytimg.com/vi/${currentSpeech.youtubeId}/hqdefault.jpg`
    : currentSpeech.imageUrl;

  const handleExpand = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMinimized(false);
    router.push('/player');
  };

  const handlePlayPause = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playPause();
  };

  const handleSkipNext = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    skipToNext();
  };

  const handleClose = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMinimized(false);
    setCurrentSpeech(null);
  };

  const tabBarHeight = Platform.OS === 'ios' ? 80 : 60;
  const bottomOffset = insets.bottom > 0 ? tabBarHeight + 4 : tabBarHeight + 8;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents={shouldShow ? 'auto' : 'none'}
    >
      <TouchableOpacity
        style={styles.miniPlayerCard}
        onPress={handleExpand}
        activeOpacity={0.95}
      >
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary || '#667eea',
              },
            ]}
          />
        </View>

        <View style={styles.content}>
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnail}
          />

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {currentSpeech.title}
            </Text>
            <Text style={styles.speaker} numberOfLines={1}>
              {currentSpeech.speaker}
            </Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              onPress={handlePlayPause}
              style={styles.controlButton}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isPlaying ? (
                <Pause size={20} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
              )}
            </TouchableOpacity>

            {currentPlaylist.length > 1 && (
              <TouchableOpacity
                onPress={handleSkipNext}
                style={styles.controlButton}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <SkipForward size={18} color="#FFFFFF" fill="#FFFFFF" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <View style={styles.expandHint}>
            <ChevronUp size={14} color="rgba(255,255,255,0.4)" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as const,
    left: 8,
    right: 8,
    zIndex: 999,
    elevation: 20,
  },
  miniPlayerCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: '100%' as const,
    width: '40%' as const,
    borderRadius: 1,
  },
  content: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2C2C3E',
  },
  info: {
    flex: 1,
    justifyContent: 'center' as const,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  speaker: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '400' as const,
    marginTop: 1,
  },
  controls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  expandHint: {
    position: 'absolute' as const,
    top: -2,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
  },
});
