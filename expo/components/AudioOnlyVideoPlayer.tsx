import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  RotateCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

let YoutubePlayer: any = null;
if (Platform.OS !== 'web') {
  try {
    YoutubePlayer = require('react-native-youtube-iframe').default;
  } catch {
    console.log('react-native-youtube-iframe not available');
  }
}

interface AudioOnlyVideoPlayerProps {
  videoId: string;
  title: string;
  thumbnail?: string;
  channelTitle?: string;
  autoplay?: boolean;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onProgressChange?: (currentTime: number, duration: number) => void;
}

export interface AudioOnlyVideoPlayerRef {
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;
  seekTo: (position: number) => void;
  getIsPlaying: () => boolean;
  resumeAfterAd: () => void;
}

const AudioOnlyVideoPlayer = forwardRef<AudioOnlyVideoPlayerRef, AudioOnlyVideoPlayerProps>(({
  videoId,
  title: _title,
  thumbnail,
  channelTitle: _channelTitle,
  autoplay = true,
  onEnd,
  onError,
  onNext,
  onPrevious,
  onPlayingChange,
  onProgressChange,
}, ref) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [userTappedPlay, setUserTappedPlay] = useState(false);

  const playerRef = useRef<any>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const thumbnailOpacity = useRef(new Animated.Value(1)).current;
  const mountedRef = useRef(true);
  const onEndCalledRef = useRef(false);
  const isPlayingRef = useRef(false);
  const durationRef = useRef(0);
  const autoplayAttemptedRef = useRef(false);
  const playAttemptCount = useRef(0);

  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onProgressChangeRef = useRef(onProgressChange);

  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onPlayingChangeRef.current = onPlayingChange; }, [onPlayingChange]);
  useEffect(() => { onProgressChangeRef.current = onProgressChange; }, [onProgressChange]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const updatePlayState = useCallback((playing: boolean) => {
    if (!mountedRef.current) return;
    isPlayingRef.current = playing;
    setIsPlaying(playing);
    onPlayingChangeRef.current?.(playing);
  }, []);

  const fadeThumbnailOut = useCallback(() => {
    Animated.timing(thumbnailOpacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      if (mountedRef.current) {
        setShowThumbnail(false);
      }
    });
  }, [thumbnailOpacity]);

  const fadeThumbnailIn = useCallback(() => {
    setShowThumbnail(true);
    Animated.timing(thumbnailOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [thumbnailOpacity]);

  useImperativeHandle(ref, () => ({
    togglePlay: () => {
      if (!playerReady || playerError) return;
      updatePlayState(!isPlayingRef.current);
    },
    play: () => {
      if (!playerReady || playerError || isPlayingRef.current) return;
      updatePlayState(true);
    },
    pause: () => {
      if (!playerReady || playerError || !isPlayingRef.current) return;
      updatePlayState(false);
    },
    seekForward: (seconds = 15) => {
      if (!playerReady || !playerRef.current) return;
      const newPos = Math.min(currentTime + seconds, durationRef.current);
      if (Platform.OS !== 'web') {
        void playerRef.current.seekTo(newPos, true);
      } else {
        postMessageToWebPlayer('seekTo', [newPos, true]);
      }
      setCurrentTime(newPos);
    },
    seekBackward: (seconds = 15) => {
      if (!playerReady || !playerRef.current) return;
      const newPos = Math.max(currentTime - seconds, 0);
      if (Platform.OS !== 'web') {
        void playerRef.current.seekTo(newPos, true);
      } else {
        postMessageToWebPlayer('seekTo', [newPos, true]);
      }
      setCurrentTime(newPos);
    },
    seekTo: async (position: number) => {
      if (!playerReady) return;
      try {
        if (Platform.OS !== 'web' && playerRef.current) {
          await playerRef.current.seekTo(position, true);
        } else {
          postMessageToWebPlayer('seekTo', [position, true]);
        }
        setCurrentTime(position);
      } catch (err) {
        console.error('Error seeking:', err);
      }
    },
    getIsPlaying: () => isPlayingRef.current,
    resumeAfterAd: () => {
      console.log('[ResumeAfterAd] Resuming playback');
      if (playerReady && !playerError) {
        updatePlayState(true);
      }
    },
  }), [playerReady, playerError, currentTime, updatePlayState]);

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

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, []);

  useEffect(() => {
    onEndCalledRef.current = false;
    autoplayAttemptedRef.current = false;
    playAttemptCount.current = 0;

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    setPlayerReady(false);
    setPlayerError(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setShowThumbnail(true);
    thumbnailOpacity.setValue(1);
    updatePlayState(false);
    setUserTappedPlay(false);

    console.log('[Player] New video loaded:', videoId);
  }, [videoId, updatePlayState, thumbnailOpacity]);

  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    progressInterval.current = setInterval(() => {
      if (!mountedRef.current || isSeeking) return;

      if (Platform.OS !== 'web' && playerRef.current) {
        try {
          if (typeof playerRef.current.getCurrentTime === 'function') {
            const timePromise = playerRef.current.getCurrentTime();
            if (timePromise && typeof timePromise.then === 'function') {
              timePromise.then((time: number) => {
                if (mountedRef.current && typeof time === 'number' && !isNaN(time)) {
                  setCurrentTime(time);
                  onProgressChangeRef.current?.(time, durationRef.current);
                }
              }).catch(() => {});
            }
          }
        } catch {}
      }
    }, 500);
  }, [isSeeking]);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const attemptAutoplay = useCallback(() => {
    if (!mountedRef.current || autoplayAttemptedRef.current) return;
    autoplayAttemptedRef.current = true;
    playAttemptCount.current += 1;

    console.log('[Autoplay] Attempting autoplay for:', videoId, 'attempt:', playAttemptCount.current);

    setTimeout(() => {
      if (!mountedRef.current) return;
      console.log('[Autoplay] Starting playback for:', videoId);
      updatePlayState(true);
      startProgressTracking();

      setTimeout(() => {
        if (mountedRef.current && isPlayingRef.current) {
          console.log('[Autoplay] Playback confirmed, fading thumbnail');
          fadeThumbnailOut();
        } else {
          console.log('[Autoplay] Playback may not have started, keeping thumbnail with play button');
        }
      }, 2000);
    }, 1200);
  }, [videoId, updatePlayState, startProgressTracking, fadeThumbnailOut]);

  const onPlayerReady = useCallback(() => {
    if (!mountedRef.current) return;
    console.log('[Player] YouTube player ready for:', videoId);
    setPlayerReady(true);
    setPlayerError(false);
    setIsLoading(false);

    try {
      if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
        void playerRef.current.getDuration().then((dur: number) => {
          if (dur > 0 && mountedRef.current) {
            setDuration(dur);
            durationRef.current = dur;
          }
        }).catch(() => {});
      }
    } catch {}

    if (autoplay) {
      attemptAutoplay();
    }
  }, [autoplay, videoId, attemptAutoplay]);

  const onPlayerError = useCallback((errorMsg: string) => {
    console.error('YouTube player error:', errorMsg);
    if (!mountedRef.current) return;
    setPlayerError(true);
    setPlayerReady(false);
    setIsLoading(false);
    updatePlayState(false);
    stopProgressTracking();
    fadeThumbnailIn();
  }, [updatePlayState, stopProgressTracking, fadeThumbnailIn]);

  const onStateChange = useCallback((state: string) => {
    if (!mountedRef.current) return;
    console.log('[Player] State:', state, 'for:', videoId);

    if (state === 'playing') {
      updatePlayState(true);
      startProgressTracking();
      setIsLoading(false);
      fadeThumbnailOut();
      return;
    }

    if (state === 'paused') {
      updatePlayState(false);
      stopProgressTracking();
      return;
    }

    if (state === 'buffering') {
      return;
    }

    if (state === 'ended') {
      if (onEndCalledRef.current) return;
      onEndCalledRef.current = true;
      updatePlayState(false);
      stopProgressTracking();
      setCurrentTime(0);
      fadeThumbnailIn();
      console.log('[Player] Video ended, calling onEnd');
      setTimeout(() => {
        if (mountedRef.current) {
          onEndRef.current?.();
        }
      }, 100);
      return;
    }
  }, [videoId, updatePlayState, startProgressTracking, stopProgressTracking, fadeThumbnailOut, fadeThumbnailIn]);

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = useCallback(() => {
    if (playerError) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!playerReady) {
      console.log('[Player] Player not ready yet, user tapped play');
      setUserTappedPlay(true);
      return;
    }

    const newPlaying = !isPlayingRef.current;
    updatePlayState(newPlaying);

    if (newPlaying) {
      startProgressTracking();
      setTimeout(() => {
        if (mountedRef.current && isPlayingRef.current) {
          fadeThumbnailOut();
        }
      }, 1500);
    } else {
      stopProgressTracking();
    }
  }, [playerReady, playerError, updatePlayState, startProgressTracking, stopProgressTracking, fadeThumbnailOut]);

  const handleManualPlay = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUserTappedPlay(true);

    if (playerReady) {
      updatePlayState(true);
      startProgressTracking();
      setTimeout(() => {
        if (mountedRef.current && isPlayingRef.current) {
          fadeThumbnailOut();
        }
      }, 1500);
    }
  }, [playerReady, updatePlayState, startProgressTracking, fadeThumbnailOut]);

  useEffect(() => {
    if (userTappedPlay && playerReady && !isPlayingRef.current) {
      console.log('[Player] Player became ready after user tap, starting playback');
      updatePlayState(true);
      startProgressTracking();
      setTimeout(() => {
        if (mountedRef.current && isPlayingRef.current) {
          fadeThumbnailOut();
        }
      }, 1500);
    }
  }, [userTappedPlay, playerReady, updatePlayState, startProgressTracking, fadeThumbnailOut]);

  const handleSkipForward = useCallback(async () => {
    if (!playerReady || !playerRef.current) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const newPosition = Math.min(currentTime + 15, duration);
      if (Platform.OS !== 'web') {
        await playerRef.current.seekTo(newPosition, true);
      } else {
        postMessageToWebPlayer('seekTo', [newPosition, true]);
      }
      setCurrentTime(newPosition);
      onProgressChangeRef.current?.(newPosition, duration);
    } catch (err) {
      console.error('Error skipping forward:', err);
    }
  }, [playerReady, currentTime, duration]);

  const handleSkipBackward = useCallback(async () => {
    if (!playerReady || !playerRef.current) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const newPosition = Math.max(currentTime - 15, 0);
      if (Platform.OS !== 'web') {
        await playerRef.current.seekTo(newPosition, true);
      } else {
        postMessageToWebPlayer('seekTo', [newPosition, true]);
      }
      setCurrentTime(newPosition);
      onProgressChangeRef.current?.(newPosition, duration);
    } catch (err) {
      console.error('Error skipping backward:', err);
    }
  }, [playerReady, currentTime, duration]);

  const handleNext = useCallback(() => {
    if (!onNext) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  }, [onNext]);

  const handlePrevious = useCallback(() => {
    if (!onPrevious) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPrevious();
  }, [onPrevious]);

  const handleSliderChange = useCallback((value: number) => {
    if (!playerReady) return;
    setCurrentTime(value);
  }, [playerReady]);

  const handleSliderComplete = useCallback(async (value: number) => {
    if (!playerReady) return;
    try {
      if (Platform.OS !== 'web' && playerRef.current) {
        await playerRef.current.seekTo(value, true);
      } else {
        postMessageToWebPlayer('seekTo', [value, true]);
      }
      setIsSeeking(false);
      onProgressChangeRef.current?.(value, duration);
    } catch (err) {
      console.error('Error seeking:', err);
      setIsSeeking(false);
    }
  }, [playerReady, duration]);

  const coverImageUrl = thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const webIframeRef = useRef<HTMLIFrameElement | null>(null);
  const webProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const postMessageToWebPlayer = useCallback((command: string, args?: any) => {
    try {
      if (Platform.OS === 'web' && webIframeRef.current?.contentWindow) {
        const msg = JSON.stringify({ event: 'command', func: command, args: args || [] });
        webIframeRef.current.contentWindow.postMessage(msg, '*');
      }
    } catch (e) {
      console.log('Error posting message to web player:', e);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data !== 'string') return;
        const data = JSON.parse(event.data);

        if (data.event === 'onReady') {
          console.log('[Web YT] Player ready for:', videoId);
          if (!mountedRef.current) return;
          setPlayerReady(true);
          setPlayerError(false);
          setIsLoading(false);

          if (autoplay || userTappedPlay) {
            setTimeout(() => {
              if (!mountedRef.current) return;
              postMessageToWebPlayer('playVideo');
              updatePlayState(true);
              setTimeout(() => {
                if (mountedRef.current && isPlayingRef.current) {
                  fadeThumbnailOut();
                }
              }, 2000);
            }, 800);
          }
        } else if (data.event === 'onStateChange') {
          const state = data.info;
          if (state === 1) {
            updatePlayState(true);
            setIsLoading(false);
            fadeThumbnailOut();
            if (!webProgressIntervalRef.current) {
              webProgressIntervalRef.current = setInterval(() => {
                postMessageToWebPlayer('getCurrentTime');
                postMessageToWebPlayer('getDuration');
              }, 500);
            }
          } else if (state === 2) {
            updatePlayState(false);
          } else if (state === 0) {
            if (!onEndCalledRef.current) {
              onEndCalledRef.current = true;
              updatePlayState(false);
              setCurrentTime(0);
              fadeThumbnailIn();
              setTimeout(() => { if (mountedRef.current) onEndRef.current?.(); }, 100);
            }
          }
        } else if (data.event === 'infoDelivery') {
          if (data.info?.currentTime !== undefined && mountedRef.current) {
            const time = data.info.currentTime;
            setCurrentTime(time);
            onProgressChangeRef.current?.(time, durationRef.current);
          }
          if (data.info?.duration !== undefined && data.info.duration > 0 && mountedRef.current) {
            setDuration(data.info.duration);
            durationRef.current = data.info.duration;
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (webProgressIntervalRef.current) {
        clearInterval(webProgressIntervalRef.current);
        webProgressIntervalRef.current = null;
      }
    };
  }, [videoId, autoplay, userTappedPlay, updatePlayState, postMessageToWebPlayer, fadeThumbnailOut, fadeThumbnailIn]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (isPlaying) {
      postMessageToWebPlayer('playVideo');
    } else {
      postMessageToWebPlayer('pauseVideo');
    }
  }, [isPlaying, postMessageToWebPlayer]);

  const renderVideoPlayer = () => {
    if (Platform.OS === 'web') {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return (
        <View style={styles.videoPlayerInCover}>
          <iframe
            ref={(el: any) => { webIframeRef.current = el; }}
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=${autoplay ? 1 : 0}&controls=0&modestbranding=1&rel=0&playsinline=1&origin=${origin}`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#000',
            } as any}
            allow="autoplay; encrypted-media"
          />
        </View>
      );
    }

    if (YoutubePlayer) {
      return (
        <View style={styles.videoPlayerInCover}>
          <YoutubePlayer
            ref={playerRef}
            videoId={videoId}
            height={coverSize}
            width={coverSize}
            play={isPlaying}
            forceAndroidAutoplay={true}
            onReady={onPlayerReady}
            onError={onPlayerError}
            onChangeState={onStateChange}
            initialPlayerParams={{
              controls: false,
              modestbranding: true,
              rel: false,
              playsinline: true,
              preventFullScreen: true,
            }}
            webViewStyle={{ borderRadius: 24, backgroundColor: '#000' }}
            webViewProps={{
              mediaPlaybackRequiresUserAction: false,
              allowsInlineMediaPlayback: true,
              javaScriptEnabled: true,
              domStorageEnabled: true,
              bounces: false,
              scrollEnabled: false,
            }}
          />
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.coverImageContainer, { transform: [{ scale: pulseAnim }] }]}>
        {renderVideoPlayer()}

        {showThumbnail && (
          <Animated.View style={[styles.thumbnailOverlay, { opacity: thumbnailOpacity }]}>
            <Image source={{ uri: coverImageUrl }} style={styles.coverImage} />
            <View style={styles.coverGradient}>
              {isLoading ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.loadingLabel}>Loading...</Text>
                </View>
              ) : !isPlaying ? (
                <TouchableOpacity
                  style={styles.bigPlayButton}
                  onPress={handleManualPlay}
                  activeOpacity={0.8}
                >
                  <Play size={36} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ) : (
                <View style={styles.nowPlayingIndicator}>
                  <View style={[styles.soundBar, styles.soundBar1]} />
                  <View style={[styles.soundBar, styles.soundBar2]} />
                  <View style={[styles.soundBar, styles.soundBar3]} />
                  <View style={[styles.soundBar, styles.soundBar4]} />
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {!showThumbnail && isPlaying && (
          <View style={styles.videoOverlayIndicator}>
            <View style={styles.nowPlayingSmall}>
              <View style={[styles.soundBarSmall, styles.soundBarSmall1]} />
              <View style={[styles.soundBarSmall, styles.soundBarSmall2]} />
              <View style={[styles.soundBarSmall, styles.soundBarSmall3]} />
            </View>
          </View>
        )}
      </Animated.View>

      <View style={styles.infoSection}>
        <Text style={styles.title} numberOfLines={2}>{_title}</Text>
        {_channelTitle ? <Text style={styles.subtitle}>{_channelTitle}</Text> : null}
      </View>

      <View style={styles.progressSection}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={currentTime}
          onValueChange={handleSliderChange}
          onSlidingStart={() => setIsSeeking(true)}
          onSlidingComplete={handleSliderComplete}
          minimumTrackTintColor="#667eea"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#FFFFFF"
          disabled={!playerReady}
        />
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatDuration(currentTime)}</Text>
          <Text style={styles.timeText}>{formatDuration(duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={handlePrevious}
          style={[styles.navButton, !onPrevious && styles.buttonDisabled]}
          disabled={!onPrevious}
          activeOpacity={0.7}
        >
          <SkipBack size={22} color="#FFFFFF" fill="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void handleSkipBackward()}
          style={[styles.seekButton, !playerReady && styles.buttonDisabled]}
          disabled={!playerReady}
          activeOpacity={0.7}
        >
          <RotateCcw size={20} color="#FFFFFF" />
          <Text style={styles.seekLabel}>15</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePlayPause}
          style={styles.playButton}
          activeOpacity={0.8}
        >
          {isLoading || (!playerReady && !userTappedPlay) ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : isPlaying ? (
            <Pause size={32} color="#000000" fill="#000000" />
          ) : (
            <Play size={32} color="#000000" fill="#000000" style={{ marginLeft: 3 }} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void handleSkipForward()}
          style={[styles.seekButton, !playerReady && styles.buttonDisabled]}
          disabled={!playerReady}
          activeOpacity={0.7}
        >
          <RotateCw size={20} color="#FFFFFF" />
          <Text style={styles.seekLabel}>15</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          style={[styles.navButton, !onNext && styles.buttonDisabled]}
          disabled={!onNext}
          activeOpacity={0.7}
        >
          <SkipForward size={22} color="#FFFFFF" fill="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {playerError && (
        <TouchableOpacity style={styles.fallbackButton} onPress={handleManualPlay} activeOpacity={0.7}>
          <Text style={styles.fallbackText}>Playback issue — tap to retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

AudioOnlyVideoPlayer.displayName = 'AudioOnlyVideoPlayer';

export default AudioOnlyVideoPlayer;

const { width } = Dimensions.get('window');
const coverSize = Math.min(width - 80, 280);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  coverImageContainer: {
    width: coverSize,
    height: coverSize,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    backgroundColor: '#000',
    position: 'relative',
  },
  videoPlayerInCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  loadingOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: 10,
    opacity: 0.8,
  },
  bigPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  videoOverlayIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    padding: 6,
  },
  nowPlayingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
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
  nowPlayingSmall: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 14,
  },
  soundBarSmall: {
    width: 2,
    backgroundColor: '#667eea',
    borderRadius: 1,
  },
  soundBarSmall1: { height: 5 },
  soundBarSmall2: { height: 10 },
  soundBarSmall3: { height: 7 },
  infoSection: {
    width: '100%',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -8,
  },
  timeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500' as const,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seekButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
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
    position: 'absolute',
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '800' as const,
    bottom: 6,
    letterSpacing: -0.3,
  },
  fallbackButton: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderRadius: 8,
  },
  fallbackText: {
    color: '#667eea',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600' as const,
  },
});
