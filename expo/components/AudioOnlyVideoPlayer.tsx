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

  // isPlayingRef: confirmed YouTube state (onStateChange + state sync).
  const isPlayingRef = useRef(false);
  const playerReadyRef = useRef(false);
  const playerErrorRef = useRef(false);
  const activeVideoIdRef = useRef(videoId);

  // WebView lifetime tracking. react-native-youtube-iframe fires onReady
  // only ONCE per WebView load — loadVideoById (video change) never
  // re-fires it. These refs keep the player recoverable across videos.
  const webViewEverReadyRef = useRef(false);
  const videoHasPlayedRef = useRef(false);
  const videoEpochRef = useRef(0);
  const pausedAtVideoEpochRef = useRef(-1);
  const videoChangedAtRef = useRef(0);

  // desiredPlayRef: what the user/app last requested (play or pause).
  const desiredPlayRef = useRef(false);
  const manualPauseRef = useRef(false);
  const lastRequestedStateRef = useRef<boolean | null>(null);
  const commandWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastManualToggleTargetRef = useRef<boolean | null>(null);
  const wasPlayingBeforeAdRef = useRef(false);

  const clearCommandWatchdog = useCallback(() => {
    if (commandWatchdogRef.current) {
      clearTimeout(commandWatchdogRef.current);
      commandWatchdogRef.current = null;
    }
  }, []);

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
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isSeekingRef.current = isSeeking; }, [isSeeking]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Clear any pending command watchdog on unmount.
  useEffect(() => {
    return () => clearCommandWatchdog();
  }, [clearCommandWatchdog]);

  // ── requestPlayState — the single entry point for play/pause ──────────
  // The `play` prop (playerPlayCommand) is the ONLY play/pause channel:
  // react-native-youtube-iframe@2.4.1 exposes no playVideo/pauseVideo ref
  // methods (verified in its source) — commands are delivered by toggling
  // the prop, which the library forwards to the WebView.
  const requestPlayState = useCallback(async (newState: boolean) => {
    if (!mountedRef.current) return;
    console.log(newState ? '[Playback] request play' : '[Playback] request pause');
    desiredPlayRef.current = newState;
    lastRequestedStateRef.current = newState;

    if (Platform.OS === 'web') {
      postMessageToWebPlayerRef.current?.(newState ? 'playVideo' : 'pauseVideo');
      return;
    }

    setPlayerPlayCommand(newState);
  }, []);

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
      // Capture intent BEFORE pausing. Includes the not-yet-started
      // autoplay case so an ad shown during startup still resumes.
      wasPlayingBeforeAdRef.current =
        isPlayingRef.current ||
        desiredPlayRef.current ||
        (autoplay && !videoHasPlayedRef.current && !manualPauseRef.current);
      pausedAtVideoEpochRef.current = videoEpochRef.current;
      bootstrapIntentRef.current++;
      autoplayBootstrapRunningRef.current = false;
      void requestPlayState(false);
    },
    resumeAfterAd: () => {
      if (!playerReadyRef.current || playerErrorRef.current) return;
      // An ad that spanned a video change must never resume/pause the
      // newer speech — the new video's own autoplay logic owns it.
      if (pausedAtVideoEpochRef.current !== videoEpochRef.current) return;
      // A manual pause before/during the ad is never overridden.
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
  }), [autoplay, requestPlayState, stopProgressTracking]);

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

  // ── Video change: reset PER-VIDEO state, keep WebView readiness ───────
  // onReady fires only once per WebView (first video). Resetting
  // playerReady on every video change was the root cause of the
  // permanently dead player after a speech change — once the WebView
  // is ready it stays ready, and controls must stay usable.
  useEffect(() => {
    console.log('[Playback] videoId changed:', videoId);
    activeVideoIdRef.current = videoId;
    videoEpochRef.current++;
    videoChangedAtRef.current = Date.now();
    videoHasPlayedRef.current = false;
    wasPlayingBeforeAdRef.current = false;
    pausedAtVideoEpochRef.current = -1;
    manualPauseRef.current = false;
    lastManualToggleTargetRef.current = null;
    clearCommandWatchdog();
    onEndCalledRef.current = false;
    isPlayingRef.current = false;
    autoplayBootstrapDoneRef.current = false;
    autoplayBootstrapRunningRef.current = false;
    bootstrapIntentRef.current++; // cancel any in-flight bootstrap

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    // Autoplay intent for the NEW video (Next/Previous/opening a speech).
    // The library reads the play prop at video-change time to choose
    // loadVideoById (autoplay) vs cueVideoById.
    const autoplayIntent = Boolean(autoplay);
    desiredPlayRef.current = autoplayIntent;
    setPlayerPlayCommand(autoplayIntent);
    setIsPlaying(false);
    setCurrentTime(0);
    setError(null);
    setIsLoading(true);
    setPlayerError(false);
    playerErrorRef.current = false;

    if (webViewEverReadyRef.current) {
      // WebView already initialized — it stays ready for every video.
      setPlayerReady(true);
      playerReadyRef.current = true;
    } else {
      // First video: wait for onReady.
      setPlayerReady(false);
      playerReadyRef.current = false;
    }

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
    webViewEverReadyRef.current = true;
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
    const isRestrictionError =
      isErrorEmbeddable || errorMsg.includes('embed') || errorMsg.includes('restricted');

    // A video/WebView that already reached ready or playing must remain
    // recoverable: transient post-ad/WebView errors are logged and cleared
    // WITHOUT disabling controls. Only a TRUE initial load failure (WebView
    // never ready, or a restriction error on a video that never played) is
    // treated as a real error.
    const isInitialLoadFailure =
      !webViewEverReadyRef.current || (isRestrictionError && !videoHasPlayedRef.current);

    if (isInitialLoadFailure) {
      setPlayerError(true);
      playerErrorRef.current = true;
      bootstrapIntentRef.current++; // cancel bootstrap
      autoplayBootstrapRunningRef.current = false;
      desiredPlayRef.current = false;
      setPlayerPlayCommand(false);
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsLoading(false);
      setError(errorMsg);
      onErrorRef.current?.(errorMsg);
      stopProgressTracking();
      return;
    }

    // Transient error (typically fired when a full-screen ad suspends the
    // WebView): keep every control alive and just stop progress polling.
    console.log('[Playback] transient player error ignored (player stays usable):', errorMsg);
    isPlayingRef.current = false;
    setIsPlaying(false);
    onPlayingChangeRef.current?.(false);
    stopProgressTracking();
  }, [stopProgressTracking]);

  // ── State change handler — AUTHORITATIVE for isPlayingRef ───────────────
  // Only this callback sets isPlayingRef. It NEVER issues new playback commands.
  const onStateChange = useCallback((state: string) => {
    if (!mountedRef.current) return;
    console.log('[Playback] YouTube state:', state);
    console.log('[Manual Playback] YouTube state:', state);

    if (state === 'playing') {
      videoHasPlayedRef.current = true;
      isPlayingRef.current = true;
      setPlayerPlayCommand(true); // keep the play prop in sync with reality
      setIsPlaying(true);
      setIsLoading(false);
      onPlayingChangeRef.current?.(true);
      console.log('[Playback] actual state playing');
      startProgressTracking();
      return;
    }

    if (state === 'paused') {
      isPlayingRef.current = false;
      setPlayerPlayCommand(false); // prop reflects actual state (proven 08dce452 behavior)
      setIsPlaying(false);
      setIsLoading(false);
      onPlayingChangeRef.current?.(false);
      console.log('[Playback] actual state paused');
      stopProgressTracking();
      return;
    }

    if (state === 'ended') {
      // Ignore a stale 'ended' from the PREVIOUS video arriving right
      // after a video change (end-of-speech ad flow).
      if (Date.now() - videoChangedAtRef.current < 800) {
        console.log('[Playback] stale ended event ignored');
        return;
      }
      if (onEndCalledRef.current) return;
      onEndCalledRef.current = true;
      isPlayingRef.current = false;
      desiredPlayRef.current = false;
      setPlayerPlayCommand(false);
      setIsPlaying(false);
      onPlayingChangeRef.current?.(false);
      stopProgressTracking();
      console.log('[Playback] video ended');
      setTimeout(() => {
        if (mountedRef.current) {
          onEndRef.current?.();
        }
      }, 100);
      return;
    }

    if (state === 'buffering') {
      console.log('[Playback] buffering');
      setIsLoading(false);
      stopProgressTracking();
    }
  }, [startProgressTracking, stopProgressTracking]);

  // ── Manual play/pause button ───────────────────────────────────────────────
  // Restored from working commit 08dce452: manual target toggle +
  // imperative command watchdog. No manual seek workarounds.
  const handlePlayPause = useCallback(() => {
  if (playerError || !playerReady) {
    console.log('Player not ready for play/pause');
    return;
  }

  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  // Restore proven manual toggle behavior from 71dd741:
  // toggle from the actual current player state.
  const nextState = !isPlayingRef.current;

  lastManualToggleTargetRef.current = nextState;

  console.log(
    'Manual play/pause:',
    isPlayingRef.current,
    '->',
    nextState
  );

  // User intent always wins over the one-shot autoplay bootstrap.
  bootstrapIntentRef.current++;
  autoplayBootstrapRunningRef.current = false;

  desiredPlayRef.current = nextState;
  lastRequestedStateRef.current = nextState;
  manualPauseRef.current = !nextState;

  // Restore the direct state/prop transition from 71dd741.
  isPlayingRef.current = nextState;
  setPlayerPlayCommand(nextState);
  setIsPlaying(nextState);
  onPlayingChangeRef.current?.(nextState);

  void requestPlayState(nextState);

  clearCommandWatchdog();
  // If the WebView ignored the command (e.g. just returned from an ad),
  // re-issue it through the play prop: a quick off→on toggle makes the
  // library deliver a fresh playVideo/pauseVideo to the WebView.
  commandWatchdogRef.current = setTimeout(() => {
    if (!mountedRef.current) return;

    const actual = isPlayingRef.current;

    if (actual !== nextState) {
      console.log('[PlayPause] Watchdog: re-issuing command via play prop');
      setPlayerPlayCommand(!nextState);
      setTimeout(() => {
        if (mountedRef.current) setPlayerPlayCommand(nextState);
      }, 120);
    }
  }, 600);

  if (!nextState) {
    stopProgressTracking();
  } else {
    startProgressTracking();
  }
}, [
  playerError,
  playerReady,
  clearCommandWatchdog,
  requestPlayState,
  stopProgressTracking,
  startProgressTracking,
]);

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
