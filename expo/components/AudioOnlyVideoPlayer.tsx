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

// YouTube IFrame API requires a player viewport of at least 200x200.
// The native player is hosted at 220x220 but visually hidden.
const NATIVE_PLAYER_SIZE = 220;

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
  // ── State ───────────────────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerPlayCommand, setPlayerPlayCommand] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────
  const playerRef = useRef<any>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const mountedRef = useRef(true);
  const onEndCalledRef = useRef(false);
  const durationRef = useRef(0);
  const currentTimeRef = useRef(0);
  const isSeekingRef = useRef(isSeeking);

  // isPlayingRef: ONLY set by onStateChange — confirmed YouTube state.
  const isPlayingRef = useRef(false);
  const playerReadyRef = useRef(false);
  const playerErrorRef = useRef(false);
  const activeVideoIdRef = useRef(videoId);

  // desiredPlayRef: what the user/app last requested (play or pause).
  const desiredPlayRef = useRef(false);
  const manualPauseRef = useRef(false);
  // Position captured on manual pause — used to freeze actual media and resume.
  const manualPausedPositionRef = useRef<number | null>(null);
  // Bumped on every manual Play/Pause press; stale async play nudges bail on mismatch.
  const manualPlayIntentRef = useRef(0);
  const wasPlayingBeforeAdRef = useRef(false);

  // ── Autoplay bootstrap refs ─────────────────────────────────────────────
  // ONE deterministic bootstrap per video. Self-disables after firing.
  const autoplayBootstrapDoneRef = useRef(false);
  const autoplayBootstrapRunningRef = useRef(false);
  // Incremented on every cancel (video change, manual pause). The bootstrap
  // captures the value at start and bails if it changes, so a stale async
  // seek cannot issue a Play command after the user pressed Pause.
  const bootstrapIntentRef = useRef(0);

  // Callback refs
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onProgressChangeRef = useRef(onProgressChange);

  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onPlayingChangeRef.current = onPlayingChange; }, [onPlayingChange]);
  useEffect(() => { onProgressChangeRef.current = onProgressChange; }, [onProgressChange]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { playerReadyRef.current = playerReady; }, [playerReady]);
  useEffect(() => { playerErrorRef.current = playerError; }, [playerError]);
  useEffect(() => { isSeekingRef.current = isSeeking; }, [isSeeking]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Optional diagnostic/fallback ONLY — playback is driven by the `play` prop
  // (playerPlayCommand). playVideo/pauseVideo are NOT documented ref methods
  // of react-native-youtube-iframe; undefined is expected, never an error.
  const sendNativeImperativeCommand = useCallback(
    (newState: boolean) => {
      const player = playerRef.current;

      console.log('[Playback Methods]', {
        requested: newState,
        refExists: Boolean(player),
        playVideo: typeof player?.playVideo,
        pauseVideo: typeof player?.pauseVideo,
        seekTo: typeof player?.seekTo,
      });

      const fn = newState ? player?.playVideo : player?.pauseVideo;

      if (typeof fn === 'function') {
        try {
          console.log('[Manual Playback] calling', newState ? 'playVideo' : 'pauseVideo');
          fn.call(player);
        } catch (error) {
          console.log('[Playback] optional imperative command failed', error);
        }
      }
    },
    []
  );

  // ── requestPlayState — the single entry point for native play/pause ────
  const requestPlayState = useCallback(async (newState: boolean) => {
    if (!mountedRef.current) return;
    console.log(newState ? '[Playback] request play' : '[Playback] request pause');
    desiredPlayRef.current = newState;

    if (Platform.OS === 'web') {
      postMessageToWebPlayerRef.current?.(newState ? 'playVideo' : 'pauseVideo');
      return;
    }

    setPlayerPlayCommand(newState);
    sendNativeImperativeCommand(newState);
  }, [sendNativeImperativeCommand]);

  // Diagnostic: the authoritative play prop must visibly transition on every command.
  useEffect(() => {
    console.log('[Playback Prop] playerPlayCommand:', playerPlayCommand);
  }, [playerPlayCommand]);

  // ── Progress tracking ───────────────────────────────────────────────────
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
              }).catch(() => {});
            }
          }
        } catch {}
      }
    }, 500);
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  // ── Imperative handle ──────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    togglePlay: () => {
      if (!playerReadyRef.current || playerErrorRef.current) {
        console.log('[Playback] toggle blocked — ready:', playerReadyRef.current, 'error:', playerErrorRef.current);
        return;
      }

      bootstrapIntentRef.current++;
      autoplayBootstrapRunningRef.current = false;

      const newState = !desiredPlayRef.current;

      console.log(
        newState
          ? '[Playback] ref requested play'
          : '[Playback] ref requested pause'
      );

      manualPauseRef.current = !newState;

      setIsPlaying(newState);
      onPlayingChangeRef.current?.(newState);

      void requestPlayState(newState);
    },
    play: () => {
      if (!playerReadyRef.current || playerErrorRef.current) return;

      bootstrapIntentRef.current++;
      autoplayBootstrapRunningRef.current = false;

      manualPauseRef.current = false;

      setIsPlaying(true);
      onPlayingChangeRef.current?.(true);

      void requestPlayState(true);
    },
    pause: () => {
      if (!playerReadyRef.current || playerErrorRef.current) return;

      bootstrapIntentRef.current++;
      autoplayBootstrapRunningRef.current = false;

      manualPauseRef.current = true;

      setIsPlaying(false);
      onPlayingChangeRef.current?.(false);

      stopProgressTracking();

      void requestPlayState(false);
    },
    pauseForAd: () => {
      wasPlayingBeforeAdRef.current = isPlayingRef.current || desiredPlayRef.current;
      manualPauseRef.current = false;
      bootstrapIntentRef.current++;
      autoplayBootstrapRunningRef.current = false;
      void requestPlayState(false);
    },
    resumeAfterAd: () => {
      if (!playerReadyRef.current || playerErrorRef.current) return;
      if (manualPauseRef.current) return;
      const shouldResume = wasPlayingBeforeAdRef.current || desiredPlayRef.current;
      if (shouldResume) {
        requestPlayState(true);
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
    getIsPlaying: () => isPlayingRef.current,
  }), [requestPlayState, stopProgressTracking]);

  // ── Pulse animation ─────────────────────────────────────────────────────
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

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, []);

  // ── Video change: reset everything, cancel old bootstrap ────────────────
  useEffect(() => {
    console.log('[Playback] component mounted for videoId:', videoId);
    activeVideoIdRef.current = videoId;
    manualPauseRef.current = false;
    manualPausedPositionRef.current = null;
    onEndCalledRef.current = false;
    desiredPlayRef.current = false;
    isPlayingRef.current = false;
    autoplayBootstrapDoneRef.current = false;
    autoplayBootstrapRunningRef.current = false;
    bootstrapIntentRef.current++; // cancel any in-flight bootstrap

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    setPlayerPlayCommand(false);
    setIsPlaying(false);
    setPlayerReady(false);
    setPlayerError(false);
    setCurrentTime(0);
    setError(null);
    setIsLoading(true);

    if (videoId) {
      const fetchVideoMetadata = async () => {
        try {
          console.log('[Playback] metadata loading for:', videoId);
          const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
          if (!apiKey) {
            console.log('[Playback] No YouTube API key, using props');
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

          console.log('[Playback] metadata loaded:', video.snippet.title);
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            console.warn('[Playback] metadata fetch timed out, using props');
          } else {
            console.warn('[Playback] metadata fetch failed, using props:', err?.message);
          }
          if (mountedRef.current) {
            setIsLoading(false);
          }
        }
      };

      void fetchVideoMetadata();
    }
  }, [videoId]);

  // ── ONE-SHOT autoplay bootstrap ─────────────────────────────────────────
  // Fires once per video after onPlayerReady. Performs a silent seek 0->1->0
  // to activate the native player, then issues a play command. Self-disables
  // via autoplayBootstrapDoneRef so it never runs again for that video.
  // If the user presses Pause while the bootstrap is in flight, the intent
  // ref is incremented and the async work bails out — no stale Play command.
  const runAutoplayBootstrap = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (!autoplay) return;
    if (autoplayBootstrapDoneRef.current) return;
    if (autoplayBootstrapRunningRef.current) return;
    if (manualPauseRef.current) return;
    if (!mountedRef.current) return;
    if (activeVideoIdRef.current !== videoId) return;
    if (!playerRef.current || typeof playerRef.current.seekTo !== 'function') return;

    autoplayBootstrapRunningRef.current = true;
    autoplayBootstrapDoneRef.current = true; // lock — never run again for this video
    const intent = bootstrapIntentRef.current;
    desiredPlayRef.current = true;

    console.log('[Autoplay Bootstrap] start');

    // Step 1: Issue initial play command
    await requestPlayState(true);

    // Step 2: Silent seek 0 -> 1 -> 0 to activate the player
    try {
      const maxSeek = Math.max(durationRef.current - 0.1, 1);
      const forward = Math.min(1, maxSeek);

      await playerRef.current.seekTo(forward, true);
      console.log('[Autoplay Bootstrap] seek 0 -> 1');

      // Wait briefly for the seek to register
      await new Promise(resolve => setTimeout(resolve, 120));

      // Bail if cancelled (video change, manual pause, unmount)
      if (
        bootstrapIntentRef.current !== intent ||
        !mountedRef.current ||
        activeVideoIdRef.current !== videoId ||
        manualPauseRef.current
      ) {
        console.log('[Autoplay Bootstrap] cancelled before return seek');
        autoplayBootstrapRunningRef.current = false;
        return;
      }

      await playerRef.current.seekTo(0, true);
      setCurrentTime(0);
      console.log('[Autoplay Bootstrap] seek 0 -> 1 -> 0');

      // Bail if cancelled after return seek
      if (
        bootstrapIntentRef.current !== intent ||
        !mountedRef.current ||
        activeVideoIdRef.current !== videoId ||
        manualPauseRef.current
      ) {
        console.log('[Autoplay Bootstrap] cancelled after return seek');
        autoplayBootstrapRunningRef.current = false;
        return;
      }

      // Step 3: Re-affirm play
      await requestPlayState(true);
      console.log('[Autoplay Bootstrap] complete');
    } catch (e) {
      console.log('[Autoplay Bootstrap] failed:', e);
    }

    autoplayBootstrapRunningRef.current = false;
  }, [autoplay, videoId, requestPlayState]);

  // ── Player ready handler (native) ────────────────────────────────────────
  const onPlayerReady = useCallback(() => {
    if (!mountedRef.current) return;
    console.log('[Playback] YouTube onReady fired for:', videoId);
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

    // ONE bootstrap per video — nothing else
    if (autoplay && !manualPauseRef.current) {
      void runAutoplayBootstrap();
    }
  }, [autoplay, videoId, runAutoplayBootstrap]);

  // ── Player error handler ────────────────────────────────────────────────
  const onPlayerError = useCallback((errorMsg: string) => {
    console.error('[Playback] YouTube player error:', errorMsg);
    if (!mountedRef.current) return;

    const isErrorEmbeddable = EMBEDDING_ERROR_CODES.has(parseInt(errorMsg, 10));
    if (isErrorEmbeddable || errorMsg.includes('embed') || errorMsg.includes('restricted')) {
      setPlayerError(true);
      playerErrorRef.current = true;
      setPlayerReady(false);
      playerReadyRef.current = false;
      bootstrapIntentRef.current++; // cancel bootstrap
      autoplayBootstrapRunningRef.current = false;
      desiredPlayRef.current = false;
      setPlayerPlayCommand(false);
      setIsPlaying(false);
      isPlayingRef.current = false;
      setError(errorMsg);
      onErrorRef.current?.(errorMsg);
      stopProgressTracking();
    }
  }, [stopProgressTracking]);

  // ── State change handler — AUTHORITATIVE for isPlayingRef ───────────────
  // Only this callback sets isPlayingRef. It NEVER issues new playback commands.
  const onStateChange = useCallback((state: string) => {
    if (!mountedRef.current) return;
    console.log('[Playback] YouTube state:', state);
    console.log('[Manual Playback] YouTube state:', state);

    if (state === 'playing') {
      isPlayingRef.current = true;
      setIsPlaying(true);
      onPlayingChangeRef.current?.(true);
      console.log('[Playback] actual state playing');
      startProgressTracking();
      return;
    }

    if (state === 'paused') {
      isPlayingRef.current = false;
      setIsPlaying(false);
      onPlayingChangeRef.current?.(false);
      console.log('[Playback] actual state paused');
      stopProgressTracking();
      return;
    }

    if (state === 'ended') {
      isPlayingRef.current = false;
      setIsPlaying(false);
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
      return;
    }

    if (state === 'buffering') {
      console.log('[Playback] buffering');
      stopProgressTracking();
    }
  }, [startProgressTracking, stopProgressTracking]);

  // ── Manual media control (native only) ───────────────────────────────
  // The play prop alone is not reliably obeyed by the native YouTube iframe.
  // Pause freezes the actual media at the captured position; Play falls back
  // to the proven seek nudge only when direct play is not confirmed by
  // onStateChange. Autoplay (runAutoplayBootstrap) stays completely separate.
  const runManualPauseFreeze = useCallback(async () => {
    if (Platform.OS === 'web') return;

    console.log('[Manual Media] pause requested');

    const player = playerRef.current;
    let pausedPosition = currentTimeRef.current;
    if (player && typeof player.getCurrentTime === 'function') {
      try {
        const t = await player.getCurrentTime();
        if (typeof t === 'number' && !Number.isNaN(t)) {
          pausedPosition = t;
        }
      } catch {
        // keep tracked position
      }
    }
    manualPausedPositionRef.current = pausedPosition;
    console.log('[Manual Media] paused position', pausedPosition);

    // Reassert the pause command.
    setPlayerPlayCommand(false);

    await new Promise((resolve) => setTimeout(resolve, 200));

    // If YouTube still reports playing, freeze the media at the pause point.
    if (isPlayingRef.current && mountedRef.current && !desiredPlayRef.current) {
      console.log('[Manual Media] pause freeze retry');
      const p = playerRef.current;
      if (p && typeof p.seekTo === 'function') {
        try {
          await p.seekTo(pausedPosition, true);
        } catch {
          // freeze is best-effort
        }
      }
      setPlayerPlayCommand(false);
    }
  }, []);

  const runManualPlayConfirm = useCallback(async () => {
    if (Platform.OS === 'web') return;

    console.log('[Manual Media] play requested');
    const intentVersion = manualPlayIntentRef.current;

    // Give direct play (play prop) a chance to confirm via onStateChange.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const cancelled = () =>
      intentVersion !== manualPlayIntentRef.current ||
      manualPauseRef.current ||
      !desiredPlayRef.current ||
      !mountedRef.current;

    if (cancelled()) {
      console.log('[Manual Media] play nudge cancelled');
      return;
    }
    if (isPlayingRef.current) return; // direct play confirmed — nothing else to do

    const player = playerRef.current;
    if (!player || typeof player.seekTo !== 'function') return;

    console.log('[Manual Media] direct play failed, running seek nudge');

    const resumePosition = manualPausedPositionRef.current ?? currentTimeRef.current;
    const nudgeTarget = Math.min(
      resumePosition + 1,
      Math.max(durationRef.current - 1, 0)
    );

    try {
      await player.seekTo(nudgeTarget, true);

      await new Promise((resolve) => setTimeout(resolve, 100));

      if (cancelled()) {
        console.log('[Manual Media] play nudge cancelled');
        return;
      }

      await player.seekTo(resumePosition, true);

      if (cancelled()) {
        console.log('[Manual Media] play nudge cancelled');
        return;
      }

      setPlayerPlayCommand(true);
      console.log('[Manual Media] play nudge complete');
    } catch (e) {
      console.log('[Manual Media] play nudge failed:', e);
    }
  }, []);

  // ── Manual play/pause button ──────────────────────────────────────────
  // Uses desiredPlayRef for requested state. Does NOT set isPlayingRef —
  // that is reserved for onStateChange (confirmed YouTube state).
  const handlePlayPause = useCallback(() => {
    console.log('[Manual Playback] button pressed', {
      desiredBefore: desiredPlayRef.current,
      actualBefore: isPlayingRef.current,
      ready: playerReadyRef.current,
      error: playerErrorRef.current,
    });
    if (!playerReadyRef.current || playerErrorRef.current) {
      console.log('[Playback] button blocked — ready:', playerReadyRef.current, 'error:', playerErrorRef.current);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Cancel any in-flight autoplay bootstrap — user intent wins
    bootstrapIntentRef.current++;
    autoplayBootstrapRunningRef.current = false;
    // Bump manual intent — cancels any in-flight play nudge (Pause wins).
    manualPlayIntentRef.current++;

    const nextState = !desiredPlayRef.current;
    console.log(nextState ? '[Playback] user requested play' : '[Playback] user requested pause');

    manualPauseRef.current = !nextState;
    desiredPlayRef.current = nextState;

    // Optimistically update UI state for instant feedback.
    // isPlayingRef stays untouched — onStateChange will confirm.
    setIsPlaying(nextState);
    onPlayingChangeRef.current?.(nextState);

    console.log('[PlayPause Diagnostic]', {
      requested: nextState,
      playerRefExists: Boolean(playerRef.current),
      playMethod: typeof playerRef.current?.playVideo,
      pauseMethod: typeof playerRef.current?.pauseVideo,
      currentActualState: isPlayingRef.current,
    });

    console.log('[Manual Playback] requesting', nextState ? 'PLAY' : 'PAUSE');
    void requestPlayState(nextState);

    // Ensure the actual media obeys the manual command (native only).
    if (nextState) {
      void runManualPlayConfirm();
    } else {
      void runManualPauseFreeze();
    }

    if (!nextState) {
      stopProgressTracking();
    } else {
      startProgressTracking();
    }
  }, [requestPlayState, stopProgressTracking, startProgressTracking, runManualPlayConfirm, runManualPauseFreeze]);

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
  const postMessageToWebPlayerRef = useRef<((command: string, args?: any) => void) | null>(null);
  const webProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const webAutoplayTriggeredRef = useRef(false);

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
          console.log('[Playback] YouTube onReady fired (web) for:', videoId);
          if (!mountedRef.current) return;
          setPlayerReady(true);
          playerReadyRef.current = true;
          setPlayerError(false);
          playerErrorRef.current = false;
          setError(null);
          setIsLoading(false);

          if (autoplay && !webAutoplayTriggeredRef.current) {
            webAutoplayTriggeredRef.current = true;
            desiredPlayRef.current = true;
            setTimeout(() => {
              if (mountedRef.current) {
                postMessageToWebPlayer('playVideo');
                setPlayerPlayCommand(true);
              }
            }, 300);
          }
        } else if (data.event === 'onStateChange') {
          const stateCode = data.info;
          if (stateCode === 1) { // playing
            isPlayingRef.current = true;
            setIsPlaying(true);
            onPlayingChangeRef.current?.(true);
            console.log('[Playback] actual state playing');
            if (!webProgressIntervalRef.current) {
              webProgressIntervalRef.current = setInterval(() => {
                postMessageToWebPlayer('getCurrentTime');
                postMessageToWebPlayer('getDuration');
              }, 500);
            }
          } else if (stateCode === 2) { // paused
            isPlayingRef.current = false;
            setIsPlaying(false);
            onPlayingChangeRef.current?.(false);
            console.log('[Playback] actual state paused');
          } else if (stateCode === 0) { // ended
            isPlayingRef.current = false;
            setIsPlaying(false);
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

  // Reset web autoplay trigger on video change
  useEffect(() => {
    webAutoplayTriggeredRef.current = false;
  }, [videoId]);

  // ── Render ──────────────────────────────────────────────────────────────
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

  const nativePlayerElement = Platform.OS !== 'web' && YoutubePlayer ? (
    <View
      pointerEvents="none"
      style={styles.nativePlayerHost}
    >
      <YoutubePlayer
        ref={playerRef}
        videoId={videoId}
        height={NATIVE_PLAYER_SIZE}
        width={NATIVE_PLAYER_SIZE}
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
        webViewStyle={styles.nativePlayerWebView}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
        }}
      />
    </View>
  ) : null;

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
  nativePlayerHost: {
    width: 220,
    height: 220,
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -110,
    opacity: 0.01,
    overflow: 'hidden',
    zIndex: 0,
  },
  nativePlayerWebView: {
    width: 220,
    height: 220,
    backgroundColor: 'transparent',
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
