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

const PLAYBACK_BUILD_MARKER = 'playback-fix-860ee35-v2';

console.log('[Playback Source] ROOT AudioOnlyVideoPlayer loaded');
console.log('[Playback Build Marker]', PLAYBACK_BUILD_MARKER);

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
  pauseForAd: () => void;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;
  seekTo: (position: number) => void;
  getIsPlaying: () => boolean;
  resumeAfterAd: () => void;
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
  const [playerPlayCommand, setPlayerPlayCommand] = useState(false);
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
  // NOTE: isPlayingRef is NOT synced from isPlaying state here.
  // isPlayingRef is only assigned in onStateChange so the watchdog can detect
  // whether the real YouTube player obeyed a manual command.
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { playerReadyRef.current = playerReady; }, [playerReady]);
  useEffect(() => { playerErrorRef.current = playerError; }, [playerError]);
  useEffect(() => { isSeekingRef.current = isSeeking; }, [isSeeking]);

  useEffect(() => {
    console.log('[Playback Trace] player prop changed:', playerPlayCommand);
  }, [playerPlayCommand]);

  useEffect(() => {
    mountedRef.current = true;
    console.log('[Playback Build Marker]', PLAYBACK_BUILD_MARKER);
    return () => { mountedRef.current = false; };
  }, []);

  // ── Play/Pause state refs ──────────────────────────────────────────────
  const desiredPlayRef = useRef(false);
  const wasPlayingBeforeAdRef = useRef(false);
  const manualPauseRef = useRef(false);
  const lastRequestedStateRef = useRef<boolean | null>(null);
  const commandWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastManualToggleTargetRef = useRef<boolean | null>(null);

  // ── Autoplay refs (restored from 08dce452) ─────────────────────────────
  const autoplayRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayAttemptRef = useRef(0);
  const mediaLoadedRef = useRef(false);
  const loadPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayInProgressRef = useRef(false);
  const autoplayWarmupDoneRef = useRef(false);
  const autoplayRecoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayPulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayWatchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayPulseDoneRef = useRef(false);
  const autoplayForceSeekDoneRef = useRef(false);

  const clearCommandWatchdog = useCallback(() => {
    if (commandWatchdogRef.current) {
      clearTimeout(commandWatchdogRef.current);
      commandWatchdogRef.current = null;
    }
  }, []);

  // ── sendNativeImperativeCommand (08dce452 + ref method logging) ─────────
  const sendNativeImperativeCommand = useCallback((newState: boolean) => {
    try {
      if (!playerRef.current) {
        console.log('[Playback Ref Methods]', {
          playVideo: 'undefined',
          pauseVideo: 'undefined',
          seekTo: 'undefined',
        });
        return;
      }
      console.log('[Playback Ref Methods]', {
        playVideo: typeof playerRef.current?.playVideo,
        pauseVideo: typeof playerRef.current?.pauseVideo,
        seekTo: typeof playerRef.current?.seekTo,
      });
      const fn = newState ? playerRef.current.playVideo : playerRef.current.pauseVideo;
      if (typeof fn === 'function') {
        fn.call(playerRef.current);
      } else {
        console.log('[Playback] Imperative method not available:', newState ? 'playVideo' : 'pauseVideo');
      }
    } catch (e) {
      console.log('[Playback] Imperative player command failed:', e);
    }
  }, []);

  // ── requestPlayState (08dce452: immediate both commands, no delay) ─────
  const requestPlayState = useCallback(async (newState: boolean) => {
    if (!mountedRef.current) return;
    console.log('[Playback] requestPlayState:', isPlayingRef.current, '->', newState);
    desiredPlayRef.current = newState;
    lastRequestedStateRef.current = newState;

    if (Platform.OS === 'web') {
      postMessageToWebPlayerRef.current?.(newState ? 'playVideo' : 'pauseVideo');
      return;
    }

    setPlayerPlayCommand(newState);
    sendNativeImperativeCommand(newState);
  }, [sendNativeImperativeCommand]);

  // ── clearAutoplayTimer (08dce452: clears all autoplay timers) ───────────
  const clearAutoplayTimer = useCallback(() => {
    if (autoplayRetryTimerRef.current) {
      clearTimeout(autoplayRetryTimerRef.current);
      autoplayRetryTimerRef.current = null;
    }
    if (loadPollTimerRef.current) {
      clearTimeout(loadPollTimerRef.current);
      loadPollTimerRef.current = null;
    }
    if (autoplayRecoveryTimerRef.current) {
      clearTimeout(autoplayRecoveryTimerRef.current);
      autoplayRecoveryTimerRef.current = null;
    }
    if (autoplayPulseTimerRef.current) {
      clearTimeout(autoplayPulseTimerRef.current);
      autoplayPulseTimerRef.current = null;
    }
    if (autoplayWatchdogTimerRef.current) {
      clearTimeout(autoplayWatchdogTimerRef.current);
      autoplayWatchdogTimerRef.current = null;
    }
    autoplayInProgressRef.current = false;
  }, []);

  // ── Unmount cleanup ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearCommandWatchdog();
      clearAutoplayTimer();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, [clearCommandWatchdog, clearAutoplayTimer]);

  // ── Progress tracking (declared before useImperativeHandle for TDZ safety)
  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    progressInterval.current = setInterval(() => {
      if (playerRef.current && !isSeekingRef.current && playerReadyRef.current && mountedRef.current) {
        try {
          if (typeof playerRef.current.getCurrentTime === 'function') {
            const timePromise = playerRef.current.getCurrentTime();
            if (timePromise && typeof timePromise.then === 'function') {
              timePromise.then((time: number) => {
                if (mountedRef.current && typeof time === 'number' && !isNaN(time)) {
                  setCurrentTime(time);
                  onProgressChangeRef.current?.(time, durationRef.current);
                }
              }).catch(() => {
                // silently ignore progress tracking errors
              });
            }
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

  if (__DEV__) {
    console.log('[Playback Init]', {
      startProgressTracking: typeof startProgressTracking,
      stopProgressTracking: typeof stopProgressTracking,
    });
  }

  // ── Imperative handle (08dce452 togglePlay + current pauseForAd/resumeAfterAd)
  useImperativeHandle(ref, () => ({
    togglePlay: () => {
      if (!playerReadyRef.current || playerErrorRef.current) {
        console.log('Player not ready for toggle');
        return;
      }
      const newState = !isPlayingRef.current;
      console.log('Ref togglePlay:', isPlayingRef.current, '->', newState);
      void requestPlayState(newState);
    },
    play: () => {
      if (!playerReadyRef.current || playerErrorRef.current) return;
      if (isPlayingRef.current) return;
      requestPlayState(true);
    },
    pause: () => {
      if (!playerReadyRef.current || playerErrorRef.current) return;
      if (!isPlayingRef.current) return;
      requestPlayState(false);
    },
    pauseForAd: () => {
      wasPlayingBeforeAdRef.current =
        isPlayingRef.current || desiredPlayRef.current;
      // Do not set manualPauseRef — ad pause is not a manual pause.
      console.log('[Playback] paused for ad');
      void requestPlayState(false);
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
    resumeAfterAd: () => {
      const shouldResume =
        wasPlayingBeforeAdRef.current &&
        !manualPauseRef.current;
      wasPlayingBeforeAdRef.current = false;
      if (!shouldResume) return;
      console.log('[Playback] resumed after ad');
      void requestPlayState(true);
    },
  }), [requestPlayState]);

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

  // ── videoId change: full clean reset (08dce452 + all timer cleanup) ────
  useEffect(() => {
    activeVideoIdRef.current = videoId;

    // Clear every previous autoplay timer
    clearAutoplayTimer();
    // Clear command watchdog
    clearCommandWatchdog();

    // Reset all playback state refs
    manualPauseRef.current = false;
    onEndCalledRef.current = false;
    autoplayTriggeredRef.current = false;
    autoplayAttemptRef.current = 0;
    mediaLoadedRef.current = false;
    autoplayWarmupDoneRef.current = false;
    autoplayPulseDoneRef.current = false;
    autoplayForceSeekDoneRef.current = false;
    lastManualToggleTargetRef.current = null;
    desiredPlayRef.current = false;
    lastRequestedStateRef.current = null;
    isPlayingRef.current = false;

    // Reset player state
    setPlayerReady(false);
    setPlayerError(false);
    setPlayerPlayCommand(false);
    setIsPlaying(false);
    setCurrentTime(0);

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    const fetchVideoMetadata = async () => {
      console.log('[Playback Trace] metadata loading for:', videoId);
      setIsLoading(true);
      setError(null);

      try {
        const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
        if (!apiKey) {
          console.log('[Playback Trace] No YouTube API key, using props');
          if (mountedRef.current) setIsLoading(false);
          return;
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

        console.log('[Playback Trace] metadata loaded:', video.snippet.title);
        setIsLoading(false);
      } catch (err: any) {
        console.error('[Playback Trace] metadata fetch failed:', err?.message);
        // Metadata failure must NOT prevent the player from being usable.
        if (mountedRef.current) {
          setError(null);
          setIsLoading(false);
        }
      }
    };

    if (videoId) {
      void fetchVideoMetadata();
    }
  }, [videoId, clearAutoplayTimer, clearCommandWatchdog]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── startAutoplay (08dce452 + manual-pause safety) ─────────────────────
  const startAutoplay = useCallback(() => {
    if (!autoplay || !mountedRef.current || activeVideoIdRef.current !== videoId) return;
    if (manualPauseRef.current) return;
    if (autoplayInProgressRef.current) return;

    autoplayInProgressRef.current = true;
    console.log('[Autoplay] Starting deterministic autoplay for:', videoId);

    const kickPlay = () => {
      if (!mountedRef.current || activeVideoIdRef.current !== videoId) return;
      if (manualPauseRef.current) return;
      desiredPlayRef.current = true;
      requestPlayState(true);
    };

    kickPlay();
    autoplayRetryTimerRef.current = setTimeout(() => {
      if (!mountedRef.current || activeVideoIdRef.current !== videoId) return;
      if (manualPauseRef.current) return;
      if (!isPlayingRef.current) {
        console.log('[Autoplay] Single retry kick');
        kickPlay();
      }
      autoplayInProgressRef.current = false;
    }, 1200);
  }, [autoplay, videoId, requestPlayState]);

  useEffect(() => {
    return () => clearAutoplayTimer();
  }, [clearAutoplayTimer]);

  // ── runWarmupSeek (08dce452 + manual-pause safety) ─────────────────────
  const runWarmupSeek = useCallback(async () => {
    if (autoplayWarmupDoneRef.current) return;
    if (manualPauseRef.current) return;
    if (!playerRef.current || typeof playerRef.current.seekTo !== 'function') return;
    if (!playerReadyRef.current || !mediaLoadedRef.current) return;

    autoplayWarmupDoneRef.current = true;
    try {
      await new Promise(resolve => setTimeout(resolve, 900));
      if (!mountedRef.current || activeVideoIdRef.current !== videoId) return;
      if (manualPauseRef.current) return;

      const oneSecondTarget = Math.min(1, Math.max(durationRef.current - 0.1, 0));
      await playerRef.current.seekTo(oneSecondTarget, true);
      setCurrentTime(oneSecondTarget);

      await new Promise(resolve => setTimeout(resolve, 150));
      if (!mountedRef.current || activeVideoIdRef.current !== videoId) return;
      if (manualPauseRef.current) return;

      await playerRef.current.seekTo(0, true);
      setCurrentTime(0);
      console.log('[Autoplay] Delayed warmup seek +1s -> 0s applied');
    } catch (e) {
      console.log('[Autoplay] Warmup seek failed (continuing):', e);
    }
  }, [videoId]);

  // ── runForcedAutoplaySeek (08dce452 + manual-pause safety) ─────────────
  const runForcedAutoplaySeek = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (manualPauseRef.current) return;
    if (autoplayForceSeekDoneRef.current) return;
    if (!playerRef.current || typeof playerRef.current.seekTo !== 'function') return;
    if (!mountedRef.current || activeVideoIdRef.current !== videoId) return;

    autoplayForceSeekDoneRef.current = true;
    try {
      const maxSeek = Math.max(durationRef.current - 0.1, 0);
      const forward = Math.min(1, maxSeek);
      console.log('[Autoplay] Forced user-like seek bootstrap:', 0, '->', forward, '->', 0);
      await playerRef.current.seekTo(forward, true);
      await new Promise(resolve => setTimeout(resolve, 180));
      if (!mountedRef.current || activeVideoIdRef.current !== videoId) return;
      if (manualPauseRef.current) return;
      await playerRef.current.seekTo(0, true);
      setCurrentTime(0);
      requestPlayState(true);
    } catch (e) {
      console.log('[Autoplay] Forced seek bootstrap failed:', e);
      autoplayForceSeekDoneRef.current = false;
    }
  }, [requestPlayState, videoId]);

  // ── onPlayerReady (08dce452 full sequence + manual-pause safety) ───────
  const onPlayerReady = useCallback(() => {
    if (!mountedRef.current) return;
    console.log('[Autoplay] YouTube player ready for video:', activeVideoIdRef.current);
    setPlayerReady(true);
    setPlayerError(false);
    setError(null);

    try {
      if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
        void playerRef.current.getDuration().then((dur: number) => {
          if (dur > 0 && mountedRef.current) {
            console.log('[Autoplay] Duration from onReady:', dur);
            setDuration(dur);
          }
        }).catch((err: any) => {
          console.log('[Autoplay] Could not get duration on ready:', err);
        });
      }
    } catch (e) {
      console.log('[Autoplay] getDuration call failed:', e);
    }

    if (autoplay && !manualPauseRef.current) {
      desiredPlayRef.current = true;
      mediaLoadedRef.current = true;

      // Warm-up seek + play
      void runWarmupSeek().finally(() => {
        if (!mountedRef.current || activeVideoIdRef.current !== videoId) return;
        if (manualPauseRef.current) return;
        requestPlayState(true);
      });

      if (Platform.OS !== 'web') {
        void runForcedAutoplaySeek();

        // Play/pause/play pulse (08dce452)
        if (!autoplayPulseDoneRef.current) {
          autoplayPulseDoneRef.current = true;
          requestPlayState(true);
          autoplayPulseTimerRef.current = setTimeout(() => {
            if (!mountedRef.current || activeVideoIdRef.current !== videoId) return;
            if (manualPauseRef.current) return;
            requestPlayState(false);
            setTimeout(() => {
              if (!mountedRef.current || activeVideoIdRef.current !== videoId) return;
              if (manualPauseRef.current) return;
              requestPlayState(true);
            }, 180);
          }, 220);
        }

        // Recovery nudge timer (08dce452)
        if (autoplayRecoveryTimerRef.current) {
          clearTimeout(autoplayRecoveryTimerRef.current);
        }
        autoplayRecoveryTimerRef.current = setTimeout(async () => {
          if (!mountedRef.current || activeVideoIdRef.current !== videoId) return;
          if (manualPauseRef.current) return;
          if (!playerRef.current || typeof playerRef.current.seekTo !== 'function') return;
          if (isPlayingRef.current || currentTimeRef.current > 0.25) return;

          try {
            const base = Math.max(currentTimeRef.current, 0);
            const nudge = Math.min(base + 0.12, Math.max(durationRef.current - 0.05, 0.12));
            console.log('[Autoplay] Native recovery nudge seek:', base, '->', nudge);
            await playerRef.current.seekTo(nudge, true);
            await new Promise(resolve => setTimeout(resolve, 140));
            if (!mountedRef.current || activeVideoIdRef.current !== videoId) return;
            if (manualPauseRef.current) return;
            await playerRef.current.seekTo(base, true);
            requestPlayState(true);
          } catch (e) {
            console.log('[Autoplay] Native recovery nudge failed:', e);
          }
        }, 1800);

        // Watchdog timer (08dce452)
        if (autoplayWatchdogTimerRef.current) {
          clearTimeout(autoplayWatchdogTimerRef.current);
        }
        autoplayWatchdogTimerRef.current = setTimeout(async () => {
          if (!mountedRef.current || activeVideoIdRef.current !== videoId) return;
          if (manualPauseRef.current) return;
          if (!playerRef.current || typeof playerRef.current.seekTo !== 'function') return;
          if (isPlayingRef.current || currentTimeRef.current > 0.35) return;

          try {
            console.log('[Autoplay] Watchdog forcing play retry');
            await playerRef.current.seekTo(1, true);
            await new Promise(resolve => setTimeout(resolve, 180));
            if (!mountedRef.current || activeVideoIdRef.current !== videoId) return;
            if (manualPauseRef.current) return;
            await playerRef.current.seekTo(0, true);
            requestPlayState(true);
          } catch (e) {
            console.log('[Autoplay] Watchdog retry failed:', e);
          }
        }, 2800);
      }
    }

    if (autoplay && !autoplayTriggeredRef.current && !manualPauseRef.current) {
      autoplayTriggeredRef.current = true;
      console.log('[Autoplay] Player ready — starting autoplay:', activeVideoIdRef.current);
      startAutoplay();
    }
  }, [autoplay, requestPlayState, runForcedAutoplaySeek, runWarmupSeek, startAutoplay]);

  const onPlayerError = useCallback((errorMsg: string) => {
    console.error('YouTube player error:', errorMsg);
    if (!mountedRef.current) return;
    setPlayerError(true);
    setPlayerReady(false);
    requestPlayState(false);
    stopProgressTracking();
  }, [requestPlayState, stopProgressTracking]);

  // ── onStateChange (08dce452: always trusts real player state) ──────────
  const onStateChange = useCallback((state: string) => {
    if (!mountedRef.current) return;
    console.log('[Playback Trace] YouTube state:', state, 'for video:', activeVideoIdRef.current);

    if (state === 'playing') {
      clearCommandWatchdog();
      lastRequestedStateRef.current = true;
      autoplayInProgressRef.current = false;
      clearAutoplayTimer();
      isPlayingRef.current = true;
      setPlayerPlayCommand(true);
      setIsPlaying(true);
      onPlayingChangeRef.current?.(true);
      startProgressTracking();
      return;
    }

    if (state === 'paused') {
      clearCommandWatchdog();
      lastRequestedStateRef.current = false;
      autoplayInProgressRef.current = false;
      lastManualToggleTargetRef.current = null;
      isPlayingRef.current = false;
      setPlayerPlayCommand(false);
      setIsPlaying(false);
      onPlayingChangeRef.current?.(false);
      stopProgressTracking();
      return;
    }

    if (state === 'ended') {
      if (onEndCalledRef.current) {
        console.log('onEnd already called for this video, ignoring');
        return;
      }
      onEndCalledRef.current = true;
      autoplayInProgressRef.current = false;
      isPlayingRef.current = false;
      setPlayerPlayCommand(false);
      setIsPlaying(false);
      stopProgressTracking();
      setCurrentTime(0);
      console.log('Video ended, calling onEnd for:', activeVideoIdRef.current);
      setTimeout(() => {
        if (mountedRef.current) {
          onEndRef.current?.();
        }
      }, 100);
      return;
    }

    if (state === 'buffering') {
      console.log('[Autoplay] Player buffering...');
    } else if (state === 'unstarted') {
      console.log('[Autoplay] Player unstarted');
    }
  }, [clearAutoplayTimer, clearCommandWatchdog, startProgressTracking, stopProgressTracking]);

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── handlePlayPause (08dce452 calculation + optimistic UI, no isPlayingRef set)
  const handlePlayPause = useCallback(() => {
    if (playerError || !playerReady) {
      console.log('Player not ready for play/pause');
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const nextState = lastManualToggleTargetRef.current === null
      ? !isPlayingRef.current
      : !lastManualToggleTargetRef.current;
    lastManualToggleTargetRef.current = nextState;
    console.log('Manual play/pause:', isPlayingRef.current, '->', nextState, '(manual target)');

    clearAutoplayTimer();
    autoplayInProgressRef.current = false;
    desiredPlayRef.current = nextState;
    lastRequestedStateRef.current = nextState;
    manualPauseRef.current = !nextState;

    // Optimistic visual update — do NOT set isPlayingRef here.
    // isPlayingRef is only set in onStateChange so the watchdog can detect
    // whether the real YouTube player obeyed the command.
    setIsPlaying(nextState);
    setPlayerPlayCommand(nextState);
    onPlayingChangeRef.current?.(nextState);

    void requestPlayState(nextState);

    // Watchdog: checks real isPlayingRef (not optimistic state)
    clearCommandWatchdog();
    commandWatchdogRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      if (nextState && manualPauseRef.current) return; // stale Play after newer Pause
      const actualState = isPlayingRef.current;
      if (actualState !== nextState) {
        console.log('[PlayPause] Retrying actual native command:', nextState);
        setPlayerPlayCommand(nextState);
        sendNativeImperativeCommand(nextState);
      }
    }, 350);

    if (!nextState) {
      stopProgressTracking();
    } else {
      startProgressTracking();
    }
  }, [
    playerError,
    playerReady,
    clearAutoplayTimer,
    clearCommandWatchdog,
    requestPlayState,
    sendNativeImperativeCommand,
    stopProgressTracking,
    startProgressTracking,
  ]);

  // NOTE: wasPlayingBeforeAdRef useEffect deleted — only pauseForAd assigns it.

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

  // ── Web player (08dce452 + manual-pause safety) ────────────────────────
  const webIframeRef = useRef<HTMLIFrameElement | null>(null);
  const postMessageToWebPlayerRef = useRef<((command: string, args?: any) => void) | null>(null);
  const webPlayerReadyRef = useRef(false);
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
    postMessageToWebPlayerRef.current = postMessageToWebPlayer;
  }, [postMessageToWebPlayer]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data !== 'string') return;
        const data = JSON.parse(event.data);

        if (data.event === 'onReady') {
          console.log('[Web YT] Player ready for:', videoId);
          webPlayerReadyRef.current = true;
          if (!mountedRef.current) return;
          setPlayerReady(true);
          setPlayerError(false);
          setError(null);

          if (autoplay && !autoplayTriggeredRef.current && !manualPauseRef.current) {
            autoplayTriggeredRef.current = true;
            autoplayInProgressRef.current = true;
            setTimeout(() => {
              if (!mountedRef.current) return;
              if (manualPauseRef.current) return;
              postMessageToWebPlayer('playVideo');
              requestPlayState(true);
            }, 300);
          }
        } else if (data.event === 'onStateChange') {
          const state = data.info;
          if (state === 1) {
            // playing
            autoplayInProgressRef.current = false;
            isPlayingRef.current = true;
            setIsPlaying(true);
            onPlayingChangeRef.current?.(true);
            if (!webProgressIntervalRef.current) {
              webProgressIntervalRef.current = setInterval(() => {
                postMessageToWebPlayer('getCurrentTime');
                postMessageToWebPlayer('getDuration');
              }, 500);
            }
          } else if (state === 2) {
            // paused
            if (!autoplayInProgressRef.current) {
              isPlayingRef.current = false;
              setIsPlaying(false);
              onPlayingChangeRef.current?.(false);
            }
          } else if (state === 0) {
            // ended
            if (!onEndCalledRef.current) {
              onEndCalledRef.current = true;
              autoplayInProgressRef.current = false;
              isPlayingRef.current = false;
              setIsPlaying(false);
              onPlayingChangeRef.current?.(false);
              setCurrentTime(0);
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
          }
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (webProgressIntervalRef.current) {
        clearInterval(webProgressIntervalRef.current);
        webProgressIntervalRef.current = null;
      }
    };
  }, [videoId, autoplay, requestPlayState, postMessageToWebPlayer]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (isPlaying) {
      postMessageToWebPlayer('playVideo');
    } else {
      postMessageToWebPlayer('pauseVideo');
    }
  }, [isPlaying, postMessageToWebPlayer]);

  const webPlayerElement = Platform.OS === 'web' ? (
    <View style={styles.hiddenPlayer}>
      <iframe
        ref={(el: any) => { webIframeRef.current = el; }}
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=${autoplay ? 1 : 0}&controls=0&modestbranding=1&rel=0&playsinline=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
        style={{ width: 1, height: 1, border: 'none', opacity: 0, position: 'absolute' as any }}
        allow="autoplay; encrypted-media"
      />
    </View>
  ) : null;

  const nativePlayerElement = Platform.OS !== 'web' && YoutubePlayer ? (
    <View style={styles.hiddenPlayer}>
      <YoutubePlayer
        ref={playerRef}
        videoId={videoId}
        height={1}
        width={1}
        play={playerPlayCommand}
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
  ) : null;

  const hiddenPlayerElement = Platform.OS === 'web' ? webPlayerElement : nativePlayerElement;

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

  if (error && !metadata) {
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
        <Text style={styles.title} numberOfLines={2}>{metadata?.title ?? _title}</Text>
        <Text style={styles.subtitle}>{metadata?.channelTitle ?? _channelTitle}</Text>
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
          onPressIn={() => console.log('[Playback Trace] physical press detected')}
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

      {__DEV__ && (
        <Text style={{ fontSize: 9, opacity: 0.4 }}>
          {PLAYBACK_BUILD_MARKER}
        </Text>
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
