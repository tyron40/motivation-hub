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

type PlayerState = 'unstarted' | 'playing' | 'paused' | 'buffering' | 'ended';

interface AudioOnlyVideoPlayerProps {
  videoId: string;
  title: string;
  thumbnail?: string;
  channelTitle?: string;
  autoplay?: boolean;
  hideUI?: boolean;
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
  resumeAfterAd: () => void;
  getIsPlaying: () => boolean;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;
  seekTo: (position: number) => void;
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

const EMBEDDING_ERROR_CODES = new Set([100, 101, 150, 153]);

const AudioOnlyVideoPlayer = forwardRef<AudioOnlyVideoPlayerRef, AudioOnlyVideoPlayerProps>(({
  videoId,
  title: _title,
  thumbnail,
  channelTitle: _channelTitle,
  autoplay = true,
  hideUI = false,
  onEnd,
  onError,
  onNext,
  onPrevious,
  onPlayingChange,
  onProgressChange,
}, ref) => {
  // ── Single playback state ──────────────────────────────────────────────
  const [shouldPlay, setShouldPlay] = useState(false);
  const [actualPlayerState, setActualPlayerState] = useState<PlayerState>('unstarted');

  const [isLoading, setIsLoading] = useState(true);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────
  const playerRef = useRef<any>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const mountedRef = useRef(true);
  const onEndCalledRef = useRef(false);
  const durationRef = useRef(0);
  const currentTimeRef = useRef(0);

  // Playback control refs
  const userPausedRef = useRef(false);
  const pausedForAdRef = useRef(false);
  const wasPlayingBeforeAdRef = useRef(false);
  const playerReadyRef = useRef(false);
  const playerErrorRef = useRef(false);
  const autoplayAttemptedRef = useRef(false);
  const autoplayJumpstartedRef = useRef(false);
  const jumpstartAbortRef = useRef(false);
  const activeVideoIdRef = useRef(videoId);

  // Refs mirroring state for imperative access without stale closures
  const shouldPlayRef = useRef(false);
  const actualPlayerStateRef = useRef<PlayerState>('unstarted');

  // Callback refs
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

  // ── Keep refs in sync with state ───────────────────────────────────────
  useEffect(() => { shouldPlayRef.current = shouldPlay; }, [shouldPlay]);
  useEffect(() => { actualPlayerStateRef.current = actualPlayerState; }, [actualPlayerState]);
  useEffect(() => { playerReadyRef.current = playerReady; }, [playerReady]);
  useEffect(() => { playerErrorRef.current = playerError; }, [playerError]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  // ── Progress tracking ──────────────────────────────────────────────────
  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    progressInterval.current = setInterval(() => {
      if (playerRef.current && !isSeeking && mountedRef.current) {
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

  // ── Silent autoplay kickstart ───────────────────────────────────────────
  // Some devices/YouTube embeds refuse to start audio until the playhead is
  // nudged. This runs once per speech load, then self-disables so the user's
  // play/pause button remains the only source of play-state changes afterwards.
  const runSilentAutoplayJumpstart = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (!autoplay) return;
    if (autoplayJumpstartedRef.current) return;
    if (userPausedRef.current || pausedForAdRef.current) return;
    if (!playerRef.current || typeof playerRef.current.seekTo !== 'function') return;
    if (durationRef.current < 1) return;

    autoplayJumpstartedRef.current = true;
    jumpstartAbortRef.current = false;

    // Let the initial play command reach the native player
    await new Promise(resolve => setTimeout(resolve, 400));
    if (
      jumpstartAbortRef.current ||
      userPausedRef.current ||
      pausedForAdRef.current ||
      !mountedRef.current ||
      activeVideoIdRef.current !== videoId
    ) {
      return;
    }

    // If playback already started on its own, no nudge is needed
    if (actualPlayerStateRef.current === 'playing' || currentTimeRef.current > 0.25) {
      console.log('[Autoplay Jumpstart] already playing, no nudge needed');
      return;
    }

    try {
      console.log('[Autoplay Jumpstart] silent +1s/-1s kickstart');
      await playerRef.current.seekTo(1, true);
      await new Promise(resolve => setTimeout(resolve, 120));
      if (
        jumpstartAbortRef.current ||
        userPausedRef.current ||
        pausedForAdRef.current ||
        !mountedRef.current ||
        activeVideoIdRef.current !== videoId
      ) {
        return;
      }
      await playerRef.current.seekTo(0, true);
      setCurrentTime(0);

      // Re-affirm play unless the user interrupted during the nudge
      if (!userPausedRef.current && !pausedForAdRef.current) {
        shouldPlayRef.current = true;
        setShouldPlay(true);
      }
    } catch (e) {
      console.log('[Autoplay Jumpstart] kickstart failed:', e);
    }
  }, [autoplay, videoId]);

  // ── Imperative handle ──────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    togglePlay: () => {
      if (!playerReadyRef.current || playerErrorRef.current) {
        console.log('[Playback] toggle blocked — ready:', playerReadyRef.current, 'error:', playerErrorRef.current);
        return;
      }
      const nextState = !shouldPlayRef.current;
      console.log('[Playback Trace] Audio player toggle received — requested:', nextState ? 'play' : 'pause');

      // Immediately update all refs synchronously so rapid taps see fresh values
      shouldPlayRef.current = nextState;
      userPausedRef.current = !nextState;
      pausedForAdRef.current = false;

      // Optimistically update visible state for instant UI response.
      // onStateChange will confirm or correct when YouTube actually responds.
      const optimisticState: PlayerState = nextState ? 'playing' : 'paused';
      actualPlayerStateRef.current = optimisticState;
      setActualPlayerState(optimisticState);
      setShouldPlay(nextState);
      onPlayingChangeRef.current?.(nextState);
    },

    play: () => {
      if (!playerReadyRef.current || playerErrorRef.current) return;
      console.log('[Playback Trace] Audio player play received');
      shouldPlayRef.current = true;
      userPausedRef.current = false;
      pausedForAdRef.current = false;
      actualPlayerStateRef.current = 'playing';
      setActualPlayerState('playing');
      setShouldPlay(true);
      onPlayingChangeRef.current?.(true);
    },

    pause: () => {
      if (!playerReadyRef.current || playerErrorRef.current) return;
      console.log('[Playback Trace] Audio player pause received');
      shouldPlayRef.current = false;
      userPausedRef.current = true;
      pausedForAdRef.current = false;
      actualPlayerStateRef.current = 'paused';
      setActualPlayerState('paused');
      setShouldPlay(false);
      onPlayingChangeRef.current?.(false);
    },

    pauseForAd: () => {
      wasPlayingBeforeAdRef.current = shouldPlayRef.current;
      pausedForAdRef.current = true;
      shouldPlayRef.current = false;
      setShouldPlay(false);
      console.log('[Playback] paused for ad');
    },

    resumeAfterAd: () => {
      const shouldResume =
        pausedForAdRef.current &&
        wasPlayingBeforeAdRef.current &&
        !userPausedRef.current;

      pausedForAdRef.current = false;
      wasPlayingBeforeAdRef.current = false;

      if (shouldResume) {
        console.log('[Playback] resumed after ad');
        shouldPlayRef.current = true;
        setShouldPlay(true);
      } else {
        console.log('[Playback] ad ended but user pause preserved');
      }
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

    getIsPlaying: () => actualPlayerStateRef.current === 'playing',
  }), []);

  // ── Pulse animation ────────────────────────────────────────────────────
  const isPlaying = actualPlayerState === 'playing';

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

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, []);

  // ── Video change: reset everything ─────────────────────────────────────
  useEffect(() => {
    console.log('[Playback Trace] component mounted for videoId:', videoId);
    activeVideoIdRef.current = videoId;
    jumpstartAbortRef.current = true; // abort any in-flight jumpstart for previous video
    autoplayJumpstartedRef.current = false;
    onEndCalledRef.current = false;
    autoplayAttemptedRef.current = false;

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    setShouldPlay(false);
    shouldPlayRef.current = false;
    setActualPlayerState('unstarted');
    actualPlayerStateRef.current = 'unstarted';
    setPlayerReady(false);
    playerReadyRef.current = false;
    setPlayerError(false);
    playerErrorRef.current = false;
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setError(null);
    setIsLoading(true);

    userPausedRef.current = false;
    pausedForAdRef.current = false;
    wasPlayingBeforeAdRef.current = false;
    jumpstartAbortRef.current = false;

    if (videoId) {
      const fetchVideoMetadata = async () => {
        try {
          console.log('[Playback Trace] metadata loading for:', videoId);
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

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch(detailsUrl.toString(), { signal: controller.signal });
          clearTimeout(timeoutId);

          if (!response.ok) {
            console.warn('[Metadata] YouTube API error:', response.status);
            return;
          }

          const data = await response.json();

          if (!data.items || data.items.length === 0) {
            console.warn('[Metadata] Video not found:', videoId);
            return;
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
          if (mountedRef.current && videoDuration > 0) {
            setDuration(videoDuration);
            durationRef.current = videoDuration;
          }

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
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            console.warn('[Playback Trace] metadata fetch timed out, using props');
          } else {
            console.warn('[Playback Trace] metadata fetch failed, using props:', err?.message);
          }
          // Metadata failure must NOT prevent the player from being usable
          if (mountedRef.current) {
            setIsLoading(false);
          }
        }
      };

      void fetchVideoMetadata();
    }
  }, [videoId]);

  // ── Player ready handler (native) ──────────────────────────────────────
  const onPlayerReady = useCallback(() => {
    if (!mountedRef.current) return;
    console.log('[Playback Trace] YouTube onReady fired for:', videoId);
    console.log('[Playback Trace] playerReadyRef true');
    setPlayerReady(true);
    playerReadyRef.current = true;
    setPlayerError(false);
    playerErrorRef.current = false;
    setError(null);
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

    // Autoplay only once after readiness
    if (
      autoplay &&
      !autoplayAttemptedRef.current &&
      !userPausedRef.current &&
      !pausedForAdRef.current
    ) {
      autoplayAttemptedRef.current = true;
      console.log('[Playback] autoplay attempt for:', videoId);
      setShouldPlay(true);
      void runSilentAutoplayJumpstart();
    }
  }, [autoplay, videoId, runSilentAutoplayJumpstart]);

  // ── Player error handler ───────────────────────────────────────────────
  const onPlayerError = useCallback((errorMsg: string) => {
    console.error('[Playback] YouTube player error:', errorMsg);
    if (!mountedRef.current) return;

    // Only classify as fatal error for embedding-restricted or unplayable videos
    const isErrorEmbeddable = EMBEDDING_ERROR_CODES.has(parseInt(errorMsg, 10));
    if (isErrorEmbeddable || errorMsg.includes('embed') || errorMsg.includes('restricted')) {
      setPlayerError(true);
      playerErrorRef.current = true;
      setPlayerReady(false);
      playerReadyRef.current = false;
      setShouldPlay(false);
      shouldPlayRef.current = false;
      setError(errorMsg);
      onErrorRef.current?.(errorMsg);
      stopProgressTracking();
    }
  }, [stopProgressTracking]);

  // ── State change handler — confirmation only, never overrides userPause
  const onStateChange = useCallback((state: string) => {
    if (!mountedRef.current) return;

    if (
      state === 'playing' ||
      state === 'paused' ||
      state === 'buffering' ||
      state === 'ended' ||
      state === 'unstarted'
    ) {
      console.log('[Playback Trace] YouTube state:', state);
      setActualPlayerState(state as PlayerState);
    }

    if (state === 'playing') {
      // YouTube confirmed playing — sync ref and notify
      shouldPlayRef.current = true;
      onPlayingChangeRef.current?.(true);
      startProgressTracking();
    }

    if (state === 'paused') {
      // Only notify pause if the user actually intended to pause.
      // If shouldPlayRef is true (user pressed play but YouTube paused briefly),
      // don't flip the UI — YouTube will resume.
      if (!shouldPlayRef.current) {
        onPlayingChangeRef.current?.(false);
      }
      stopProgressTracking();
    }

    if (state === 'buffering') {
      // Don't change playing notification during buffering — keep current UI state
      stopProgressTracking();
    }

    if (state === 'ended') {
      shouldPlayRef.current = false;
      setShouldPlay(false);
      onPlayingChangeRef.current?.(false);
      stopProgressTracking();
      if (!onEndCalledRef.current) {
        onEndCalledRef.current = true;
        console.log('[Playback] video ended');
        setTimeout(() => {
          if (mountedRef.current) {
            onEndRef.current?.();
          }
        }, 100);
      }
    }
  }, [startProgressTracking, stopProgressTracking]);

  // ── Manual play/pause button ───────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (!playerReadyRef.current || playerErrorRef.current) {
      console.log('[Playback] button blocked — ready:', playerReadyRef.current, 'error:', playerErrorRef.current);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Cancel any in-flight autoplay jumpstart so user intent wins
    jumpstartAbortRef.current = true;

    const nextState = !shouldPlayRef.current;
    console.log('[Playback Trace] Requested state:', nextState ? 'play' : 'pause');

    // Immediately update all refs + state for instant UI response
    shouldPlayRef.current = nextState;
    userPausedRef.current = !nextState;
    pausedForAdRef.current = false;

    const optimisticState: PlayerState = nextState ? 'playing' : 'paused';
    actualPlayerStateRef.current = optimisticState;
    setActualPlayerState(optimisticState);
    setShouldPlay(nextState);
    onPlayingChangeRef.current?.(nextState);
  }, []);

  const handleSkipForward = useCallback(async () => {
    if (!playerReadyRef.current || !playerRef.current) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const newPosition = Math.min(currentTimeRef.current + 15, duration);
      await playerRef.current.seekTo(newPosition, true);
      setCurrentTime(newPosition);
      onProgressChangeRef.current?.(newPosition, duration);
    } catch (err) {
      console.error('Error skipping forward:', err);
    }
  }, [duration]);

  const handleSkipBackward = useCallback(async () => {
    if (!playerReadyRef.current || !playerRef.current) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const newPosition = Math.max(currentTimeRef.current - 15, 0);
      await playerRef.current.seekTo(newPosition, true);
      setCurrentTime(newPosition);
      onProgressChangeRef.current?.(newPosition, duration);
    } catch (err) {
      console.error('Error skipping backward:', err);
    }
  }, [duration]);

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
    if (!playerReadyRef.current) return;
    setCurrentTime(value);
  }, []);

  const handleSliderComplete = useCallback(async (value: number) => {
    if (!playerReadyRef.current || !playerRef.current) return;
    try {
      await playerRef.current.seekTo(value, true);
      setIsSeeking(false);
      onProgressChangeRef.current?.(value, duration);
    } catch (err) {
      console.error('Error seeking:', err);
      setIsSeeking(false);
    }
  }, [duration]);

  // ── Web player support ─────────────────────────────────────────────────
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

  // Web: controlled play/pause via shouldPlay
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (shouldPlay) {
      postMessageToWebPlayer('playVideo');
    } else {
      postMessageToWebPlayer('pauseVideo');
    }
  }, [shouldPlay, postMessageToWebPlayer]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data !== 'string') return;
        const data = JSON.parse(event.data);

        if (data.event === 'onReady') {
          console.log('[Playback Trace] YouTube onReady fired (web) for:', videoId);
          console.log('[Playback Trace] playerReadyRef true');
          if (!mountedRef.current) return;
          setPlayerReady(true);
          playerReadyRef.current = true;
          setPlayerError(false);
          playerErrorRef.current = false;
          setError(null);
          setIsLoading(false);

          if (
            autoplay &&
            !autoplayAttemptedRef.current &&
            !userPausedRef.current &&
            !pausedForAdRef.current
          ) {
            autoplayAttemptedRef.current = true;
            console.log('[Playback] web autoplay attempt for:', videoId);
            setShouldPlay(true);
          }
        } else if (data.event === 'onStateChange') {
          const stateCode = data.info;
          let stateStr: PlayerState = 'unstarted';
          if (stateCode === 1) stateStr = 'playing';
          else if (stateCode === 2) stateStr = 'paused';
          else if (stateCode === 3) stateStr = 'buffering';
          else if (stateCode === 0) stateStr = 'ended';

          console.log('[Playback Trace] YouTube state:', stateStr);
          setActualPlayerState(stateStr);

          if (stateStr === 'playing') {
            shouldPlayRef.current = true;
            onPlayingChangeRef.current?.(true);
            if (!webProgressIntervalRef.current) {
              webProgressIntervalRef.current = setInterval(() => {
                postMessageToWebPlayer('getCurrentTime');
                postMessageToWebPlayer('getDuration');
              }, 500);
            }
          } else if (stateStr === 'paused') {
            // Only notify pause if user intended to pause
            if (!shouldPlayRef.current) {
              onPlayingChangeRef.current?.(false);
            }
          } else if (stateStr === 'ended') {
            shouldPlayRef.current = false;
            setShouldPlay(false);
            onPlayingChangeRef.current?.(false);
            if (webProgressIntervalRef.current) {
              clearInterval(webProgressIntervalRef.current);
              webProgressIntervalRef.current = null;
            }
            if (!onEndCalledRef.current) {
              onEndCalledRef.current = true;
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
  }, [videoId, autoplay, postMessageToWebPlayer]);

  // ── Render ─────────────────────────────────────────────────────────────
  const coverImageUrl = thumbnail || metadata?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const webPlayerElement = Platform.OS === 'web' ? (
    <View style={styles.hiddenPlayer}>
      <iframe
        ref={(el: any) => { webIframeRef.current = el; }}
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=0&modestbranding=1&rel=0&playsinline=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
        style={{ width: 1, height: 1, border: 'none', opacity: 0, position: 'absolute' as any }}
        allow="autoplay; encrypted-media"
      />
    </View>
  ) : null;

  const nativePlayerElement = Platform.OS !== 'web' && YoutubePlayer ? (() => {
    console.log('[Playback Trace] YouTube iframe mounted for:', videoId);
    return (
      <View style={styles.hiddenPlayer}>
        <YoutubePlayer
          ref={playerRef}
          videoId={videoId}
          height={200}
          width={300}
          play={shouldPlay}
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
  })() : null;

  const hiddenPlayerElement = Platform.OS === 'web' ? webPlayerElement : nativePlayerElement;

  if (hideUI) {
    return (
      <View style={styles.container}>
        {hiddenPlayerElement}
      </View>
    );
  }

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

  if (error && !metadata && playerError) {
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
          onPress={handlePlayPause}
          style={styles.playButton}
          activeOpacity={0.8}
          disabled={!playerReady || playerError}
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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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
