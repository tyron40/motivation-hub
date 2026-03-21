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
} from 'react-native';
import Slider from '@react-native-community/slider';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  RotateCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

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
}

interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  duration: number;
  viewCount: number;
  publishedAt: string;
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
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  
  const playerRef = useRef<any>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isPlayingRef = useRef(isPlaying);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const playerReadyRef = useRef(playerReady);
  const playerErrorRef = useRef(playerError);
  const activeVideoIdRef = useRef(videoId);
  const onEndCalledRef = useRef(false);
  const autoplayTriggeredRef = useRef(false);
  const isSeekingRef = useRef(isSeeking);
  const mountedRef = useRef(true);

  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onProgressChangeRef = useRef(onProgressChange);

  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onPlayingChangeRef.current = onPlayingChange; }, [onPlayingChange]);
  useEffect(() => { onProgressChangeRef.current = onProgressChange; }, [onProgressChange]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { playerReadyRef.current = playerReady; }, [playerReady]);
  useEffect(() => { playerErrorRef.current = playerError; }, [playerError]);
  useEffect(() => { isSeekingRef.current = isSeeking; }, [isSeeking]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const commitPlayState = useCallback((newState: boolean) => {
    if (!mountedRef.current) return;
    console.log('commitPlayState:', isPlayingRef.current, '->', newState);
    isPlayingRef.current = newState;
    setIsPlaying(newState);
    onPlayingChangeRef.current?.(newState);
  }, []);

  useImperativeHandle(ref, () => ({
    togglePlay: () => {
      if (!playerReadyRef.current || playerErrorRef.current) {
        console.log('Player not ready for toggle');
        return;
      }
      const newState = !isPlayingRef.current;
      console.log('Ref togglePlay:', isPlayingRef.current, '->', newState);
      commitPlayState(newState);
    },
    play: () => {
      if (!playerReadyRef.current || playerErrorRef.current) return;
      if (isPlayingRef.current) return;
      commitPlayState(true);
    },
    pause: () => {
      if (!playerReadyRef.current || playerErrorRef.current) return;
      if (!isPlayingRef.current) return;
      commitPlayState(false);
    },
    seekForward: (seconds = 15) => {
      if (!playerReadyRef.current || !playerRef.current) return;
      const newPos = Math.min(currentTimeRef.current + seconds, durationRef.current);
      void playerRef.current.seekTo(newPos, true);
      setCurrentTime(newPos);
    },
    seekBackward: (seconds = 15) => {
      if (!playerReadyRef.current || !playerRef.current) return;
      const newPos = Math.max(currentTimeRef.current - seconds, 0);
      void playerRef.current.seekTo(newPos, true);
      setCurrentTime(newPos);
    },
    seekTo: async (position: number) => {
      if (!playerReadyRef.current || !playerRef.current) return;
      try {
        await playerRef.current.seekTo(position, true);
        setCurrentTime(position);
      } catch (err) {
        console.error('Error seeking:', err);
      }
    },
    getIsPlaying: () => isPlayingRef.current,
  }), [commitPlayState]);

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
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
    activeVideoIdRef.current = videoId;
    onEndCalledRef.current = false;
    autoplayTriggeredRef.current = false;
    autoplayAttemptRef.current = 0;
    mediaLoadedRef.current = false;
    if (autoplayRetryTimerRef.current) {
      clearTimeout(autoplayRetryTimerRef.current);
      autoplayRetryTimerRef.current = null;
    }
    if (loadPollTimerRef.current) {
      clearTimeout(loadPollTimerRef.current);
      loadPollTimerRef.current = null;
    }

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    const fetchVideoMetadata = async () => {
      console.log(`Fetching metadata for video: ${videoId}`);
      setIsLoading(true);
      setError(null);

      try {
        const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
        if (!apiKey) {
          throw new Error('YouTube API key not configured');
        }

        const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
        detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
        detailsUrl.searchParams.set('id', videoId);
        detailsUrl.searchParams.set('key', apiKey);

        const response = await fetch(detailsUrl.toString());
        
        if (!response.ok) {
          throw new Error(`YouTube API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
          throw new Error('Video not found');
        }

        const video = data.items[0];
        
        const parseDuration = (dur: string): number => {
          const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (!match) return 0;
          const hours = parseInt(match[1] || '0');
          const minutes = parseInt(match[2] || '0');
          const seconds = parseInt(match[3] || '0');
          return hours * 3600 + minutes * 60 + seconds;
        };

        const videoDuration = parseDuration(video.contentDetails.duration);
        setDuration(videoDuration);

        if (mountedRef.current) {
          setMetadata({
            id: video.id,
            title: video.snippet.title,
            description: video.snippet.description || '',
            thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
            channelTitle: video.snippet.channelTitle,
            duration: videoDuration,
            viewCount: parseInt(video.statistics.viewCount || '0'),
            publishedAt: video.snippet.publishedAt,
          });
        }

        console.log('Video metadata fetched:', video.snippet.title);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error fetching video metadata:', err);
        if (mountedRef.current) {
          setError(err.message || 'Failed to fetch video data');
          setIsLoading(false);
          onErrorRef.current?.(err.message || 'Failed to fetch video data');
        }
      }
    };

    if (videoId) {
      setPlayerReady(false);
      setPlayerError(false);
      setCurrentTime(0);
      setIsPlaying(false);
      isPlayingRef.current = false;
      void fetchVideoMetadata();
    }
  }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    progressInterval.current = setInterval(async () => {
      if (playerRef.current && !isSeekingRef.current && playerReadyRef.current && mountedRef.current) {
        try {
          const time = await playerRef.current.getCurrentTime();
          if (mountedRef.current) {
            setCurrentTime(time);
            onProgressChangeRef.current?.(time, durationRef.current);
          }
        } catch {
          // silently ignore progress tracking errors
        }
      }
    }, 500);
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const autoplayRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayAttemptRef = useRef(0);
  const mediaLoadedRef = useRef(false);
  const loadPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayInProgressRef = useRef(false);

  const clearAutoplayTimer = useCallback(() => {
    if (autoplayRetryTimerRef.current) {
      clearTimeout(autoplayRetryTimerRef.current);
      autoplayRetryTimerRef.current = null;
    }
    if (loadPollTimerRef.current) {
      clearTimeout(loadPollTimerRef.current);
      loadPollTimerRef.current = null;
    }
    autoplayInProgressRef.current = false;
  }, []);

  const startAutoplay = useCallback(() => {
    if (!autoplay || !mountedRef.current || activeVideoIdRef.current !== videoId) return;
    if (autoplayInProgressRef.current) {
      console.log('[Autoplay] Already in progress, skipping');
      return;
    }
    autoplayInProgressRef.current = true;
    autoplayAttemptRef.current = 0;
    console.log('[Autoplay] Starting autoplay sequence for:', videoId);

    const attemptPlay = () => {
      if (!mountedRef.current || activeVideoIdRef.current !== videoId || !autoplayInProgressRef.current) return;
      autoplayAttemptRef.current += 1;
      const attempt = autoplayAttemptRef.current;

      if (attempt > 8) {
        console.log(`[Autoplay] Giving up after ${attempt} attempts`);
        autoplayInProgressRef.current = false;
        return;
      }

      if (!playerRef.current || !playerReadyRef.current) {
        console.log(`[Autoplay] Player not ready, retry #${attempt} in 1s`);
        autoplayRetryTimerRef.current = setTimeout(attemptPlay, 1000);
        return;
      }

      playerRef.current.getState().then((state: string) => {
        if (!mountedRef.current || activeVideoIdRef.current !== videoId || !autoplayInProgressRef.current) return;
        console.log(`[Autoplay] Attempt #${attempt}, player state: ${state}`);

        if (state === 'playing') {
          console.log('[Autoplay] Already playing!');
          if (!isPlayingRef.current) commitPlayState(true);
          autoplayInProgressRef.current = false;
          return;
        }

        commitPlayState(true);

        const delay = attempt <= 2 ? 1500 : 2500;
        autoplayRetryTimerRef.current = setTimeout(() => {
          if (!mountedRef.current || activeVideoIdRef.current !== videoId || !autoplayInProgressRef.current) return;
          if (!playerRef.current) {
            autoplayInProgressRef.current = false;
            return;
          }
          playerRef.current.getState().then((s: string) => {
            if (!mountedRef.current || activeVideoIdRef.current !== videoId) return;
            if (s === 'playing') {
              console.log('[Autoplay] Confirmed playing after attempt #' + attempt);
              if (!isPlayingRef.current) commitPlayState(true);
              autoplayInProgressRef.current = false;
            } else {
              console.log(`[Autoplay] Still not playing (${s}), will retry`);
              attemptPlay();
            }
          }).catch(() => {
            attemptPlay();
          });
        }, delay);
      }).catch(() => {
        const delay = 1500;
        autoplayRetryTimerRef.current = setTimeout(attemptPlay, delay);
      });
    };

    autoplayRetryTimerRef.current = setTimeout(attemptPlay, 500);
  }, [autoplay, videoId, commitPlayState]);

  useEffect(() => {
    return () => clearAutoplayTimer();
  }, [clearAutoplayTimer]);

  const onPlayerReady = useCallback(() => {
    if (!mountedRef.current) return;
    console.log('[Autoplay] YouTube player ready for video:', activeVideoIdRef.current);
    setPlayerReady(true);
    setPlayerError(false);
    setError(null);
    
    if (playerRef.current) {
      void playerRef.current.getDuration().then((dur: number) => {
        if (dur > 0 && mountedRef.current) {
          console.log('[Autoplay] Duration from onReady:', dur);
          setDuration(dur);
        }
      }).catch((err: any) => {
        console.error('[Autoplay] Error getting duration on ready:', err);
      });
      
      if (autoplay && !autoplayTriggeredRef.current) {
        autoplayTriggeredRef.current = true;
        console.log('[Autoplay] Player ready — starting autoplay:', activeVideoIdRef.current);
        startAutoplay();
      }
    }
  }, [autoplay, startAutoplay]);

  const onPlayerError = useCallback((errorMsg: string) => {
    console.error('YouTube player error:', errorMsg);
    if (!mountedRef.current) return;
    setPlayerError(true);
    setPlayerReady(false);
    commitPlayState(false);
    stopProgressTracking();
  }, [commitPlayState, stopProgressTracking]);

  const onStateChange = useCallback((state: string) => {
    if (!mountedRef.current) return;
    console.log('Player state:', state, 'for video:', activeVideoIdRef.current);

    if (state === 'ended') {
      if (onEndCalledRef.current) {
        console.log('onEnd already called for this video, ignoring');
        return;
      }
      onEndCalledRef.current = true;
      commitPlayState(false);
      stopProgressTracking();
      setCurrentTime(0);
      console.log('Video ended, calling onEnd for:', activeVideoIdRef.current);
      onEndRef.current?.();
      return;
    }

    if (state === 'playing') {
      if (autoplayInProgressRef.current) {
        console.log('[Autoplay] Confirmed playing via state change');
        autoplayInProgressRef.current = false;
        clearAutoplayTimer();
      }
      if (!isPlayingRef.current) {
        commitPlayState(true);
      }
      startProgressTracking();
    } else if (state === 'paused') {
      if (!autoplayInProgressRef.current && isPlayingRef.current) {
        commitPlayState(false);
      }
      if (!autoplayInProgressRef.current) {
        stopProgressTracking();
      }
    } else if (state === 'buffering') {
      console.log('[Autoplay] Player buffering...');
    } else if (state === 'unstarted') {
      console.log('[Autoplay] Player unstarted');
    }
  }, [commitPlayState, startProgressTracking, stopProgressTracking, clearAutoplayTimer]);

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
    if (playerError) {
      console.log('Player error state, cannot play/pause');
      return;
    }
    if (!playerReady) {
      console.log('Player not ready yet');
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newState = !isPlayingRef.current;
    console.log(isPlayingRef.current ? 'Pausing video' : 'Playing video');
    commitPlayState(newState);
  }, [playerReady, playerError, commitPlayState]);

  const handleSkipForward = useCallback(async () => {
    if (!playerReady || !playerRef.current) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const newPosition = Math.min(currentTime + 15, duration);
      await playerRef.current.seekTo(newPosition, true);
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
      await playerRef.current.seekTo(newPosition, true);
      setCurrentTime(newPosition);
      onProgressChangeRef.current?.(newPosition, duration);
    } catch (err) {
      console.error('Error skipping backward:', err);
    }
  }, [playerReady, currentTime, duration]);

  const handleNext = useCallback(() => {
    if (!onNext) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('Next speech requested');
    onNext();
  }, [onNext]);

  const handlePrevious = useCallback(() => {
    if (!onPrevious) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('Previous speech requested');
    onPrevious();
  }, [onPrevious]);

  const handleSliderChange = useCallback((value: number) => {
    if (!playerReady || !playerRef.current) return;
    setCurrentTime(value);
  }, [playerReady]);

  const handleSliderComplete = useCallback(async (value: number) => {
    if (!playerReady || !playerRef.current) return;
    try {
      await playerRef.current.seekTo(value, true);
      setIsSeeking(false);
      onProgressChangeRef.current?.(value, duration);
    } catch (err) {
      console.error('Error seeking:', err);
      setIsSeeking(false);
    }
  }, [playerReady, duration]);

  const coverImageUrl = thumbnail || metadata?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const hiddenPlayerElement = (
    <View style={styles.hiddenPlayer}>
      <YoutubePlayer
        ref={playerRef}
        videoId={videoId}
        height={1}
        width={1}
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
        webViewStyle={styles.hiddenWebView}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        {hiddenPlayerElement}
        <View style={styles.coverImageContainer}>
          <Image source={{ uri: coverImageUrl }} style={styles.coverImage} blurRadius={2} />
          <View style={styles.coverOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.loadingText}>Loading audio...</Text>
      </View>
    );
  }

  if (error || !metadata) {
    return (
      <View style={styles.container}>
        {hiddenPlayerElement}
        <View style={styles.coverImageContainer}>
          <Image source={{ uri: coverImageUrl }} style={styles.coverImage} />
          <View style={styles.coverOverlay}>
            <Text style={styles.errorText}>Cannot load audio</Text>
            <Text style={styles.errorSub}>{error || 'Video not found'}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.coverImageContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Image source={{ uri: coverImageUrl }} style={styles.coverImage} />
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

      {hiddenPlayerElement}

      <View style={styles.infoSection}>
        <Text style={styles.title} numberOfLines={2}>{metadata.title}</Text>
        <Text style={styles.subtitle}>{metadata.channelTitle}</Text>
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
          {!playerReady ? (
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
        <View style={styles.fallbackButton}>
          <Text style={styles.fallbackText}>Audio playback issue - try next speech</Text>
        </View>
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
    backgroundColor: '#1C1C1E',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  hiddenPlayer: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
    top: -9999,
    left: -9999,
  },
  hiddenWebView: {
    backgroundColor: 'transparent',
    width: 1,
    height: 1,
  },
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
  loadingText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#ff6b6b',
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSub: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 16,
  },
  fallbackButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 8,
  },
  fallbackText: {
    color: '#ff6b6b',
    fontSize: 13,
    textAlign: 'center',
  },
});
