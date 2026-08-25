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
import { getBackendUrl } from '@/lib/config';

import { playbackAdCoordinator } from '@/services/PlaybackAdCoordinator';
let YoutubePlayer: any = null;
if (Platform.OS !== 'web') {
  try {
    YoutubePlayer = require('react-native-youtube-iframe').default;
  } catch {
    console.log('react-native-youtube-iframe not available');
  }
}

// YouTube IFrame API requires a player viewport of at least 200x200.
// The native player is hosted at 220x220 but visually hidden.
const NATIVE_PLAYER_SIZE = 220;

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
  hideUI?: boolean;
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
  pauseForAd: () => void;
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
  hideUI = false,
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
  const isSeekingRef = useRef(isSeeking);
  const mountedRef = useRef(true);

  // â”€â”€ Autoplay bootstrap refs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ONE deterministic bootstrap per video. Self-disables after firing.
  const autoplayBootstrapDoneRef = useRef(false);
  const autoplayBootstrapRunningRef = useRef(false);
  // Incremented on every cancel (video change, manual pause). The bootstrap
  // captures the value at start and bails if it changes, so a stale async
  // seek cannot issue a Play command after the user pressed Pause.
  const bootstrapIntentRef = useRef(0);

  // â”€â”€ Play-state refs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // desiredPlayRef: what the user/app last requested (play or pause).
  // isPlayingRef: confirmed YouTube state (onStateChange + state sync).
  const desiredPlayRef = useRef(false);
  const wasPlayingBeforeAdRef = useRef(false);

  // True once the active YouTube item has successfully reached ready/playing.
  // This lets us distinguish a real load failure from a transient error on
  // content that was already working before an ad interruption.
  const playerHadReadyRef = useRef(false);

  // Remains true for the lifetime of this video once an ad interrupts it.
  // Do NOT clear this at ad dismissal; late YouTube callbacks can arrive
  // after the ad closes or even after the video reports ended.
  const adInterruptedVideoRef = useRef(false);
  const temporarilyPausedForAdRef = useRef(false);

  const manualPauseRef = useRef(false);
  const lastRequestedStateRef = useRef<boolean | null>(null);
  const commandWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastManualToggleTargetRef = useRef<boolean | null>(null);

  const clearCommandWatchdog = useCallback(() => {
    if (commandWatchdogRef.current) {
      clearTimeout(commandWatchdogRef.current);
      commandWatchdogRef.current = null;
    }
  }, []);

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
    console.log('[Playback] component mounted', videoId);
    return () => { mountedRef.current = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear any pending command watchdog on unmount.
  useEffect(() => {
    return () => clearCommandWatchdog();
  }, [clearCommandWatchdog]);

  // Optional diagnostic/fallback ONLY â€” playback is driven by the `play` prop
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

  // â”€â”€ requestPlayState â€” the single entry point for native play/pause â”€â”€â”€â”€
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
    sendNativeImperativeCommand(newState);
  }, [sendNativeImperativeCommand]);

  // Diagnostic: the authoritative play prop must visibly transition on every command.
  useEffect(() => {
    console.log('[Playback Prop] playerPlayCommand:', playerPlayCommand);
  }, [playerPlayCommand]);

  // â”€â”€ Progress tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    useEffect(() => {
    const unregisterAdPlayback = playbackAdCoordinator.register({
      pauseForAd: () => {
        // Ad interruption is temporary and separate from user intent.
        wasPlayingBeforeAdRef.current =
          isPlayingRef.current || desiredPlayRef.current;

        temporarilyPausedForAdRef.current = true;
      adInterruptedVideoRef.current = true;

        // Never convert an ad pause into a user's manual pause.
        manualPauseRef.current = false;

        bootstrapIntentRef.current++;
        autoplayBootstrapRunningRef.current = false;

        // Pause the underlying player without destroying desired intent.
        setPlayerPlayCommand(false);
        sendNativeImperativeCommand(false);
        stopProgressTracking();
      },

      resumeAfterAd: () => {
        const shouldResume = wasPlayingBeforeAdRef.current;

        // Clear temporary ad state FIRST so all controls become usable
        // regardless of whether automatic resume succeeds.
        temporarilyPausedForAdRef.current = false;
        wasPlayingBeforeAdRef.current = false;

        // An already-working player must remain usable after ad dismissal.
        if (playerHadReadyRef.current) {
          playerErrorRef.current = false;
          setPlayerError(false);

          playerReadyRef.current = true;
          setPlayerReady(true);
        }

        // A real user pause must always win.
        if (!shouldResume || manualPauseRef.current) {
          return;
        }

        desiredPlayRef.current = true;
        lastRequestedStateRef.current = true;

        setPlayerPlayCommand(true);
        setIsPlaying(true);
        onPlayingChangeRef.current?.(true);

        void requestPlayState(true);
      },
    });

    return unregisterAdPlayback;
  }, [
    requestPlayState,
    sendNativeImperativeCommand,
    stopProgressTracking,
  ]);

useImperativeHandle(ref, () => ({
    togglePlay: () => {
      if (
        playerErrorRef.current &&
        !playbackAdCoordinator.isAdActive
      ) {
        playerErrorRef.current = false;
        setPlayerError(false);
      }

      if (!playerReadyRef.current) {
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
    pauseForAd: () => {
      wasPlayingBeforeAdRef.current =
        isPlayingRef.current || desiredPlayRef.current;

      temporarilyPausedForAdRef.current = true;
      adInterruptedVideoRef.current = true;

      // Ad pause is never a user/manual pause.
      manualPauseRef.current = false;

      bootstrapIntentRef.current++;
      autoplayBootstrapRunningRef.current = false;

      // Preserve the user's desired play intent while only pausing
      // the actual player for the temporary ad interruption.
      setPlayerPlayCommand(false);
      sendNativeImperativeCommand(false);
      stopProgressTracking();
    },
    resumeAfterAd: () => {
      const shouldResume = wasPlayingBeforeAdRef.current === true;

      // Ad interruption is fully consumed at dismissal.
      temporarilyPausedForAdRef.current = false;
      wasPlayingBeforeAdRef.current = false;

      if (manualPauseRef.current) return;

      // A stale error left by the interrupted video must not make
      // future manual controls permanently unusable.
      if (playerErrorRef.current) {
        playerErrorRef.current = false;
        setPlayerError(false);
      }

      if (playerHadReadyRef.current) {
        playerReadyRef.current = true;
        setPlayerReady(true);
      }

      if (shouldResume && playerReadyRef.current) {
        desiredPlayRef.current = true;
        lastRequestedStateRef.current = true;
        void requestPlayState(true);
      }
    },
  }), [requestPlayState, stopProgressTracking]);

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

  // â”€â”€ Video change: reset everything, cancel old bootstrap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    activeVideoIdRef.current = videoId;

    // New YouTube item = completely new lifecycle.
    playerHadReadyRef.current = false;
    adInterruptedVideoRef.current = false;

    // A new speech begins from a completely clean transient state.
    manualPauseRef.current = false;
    temporarilyPausedForAdRef.current = false;
    wasPlayingBeforeAdRef.current = false;

    lastManualToggleTargetRef.current = null;
    lastRequestedStateRef.current = null;

    clearCommandWatchdog();
    onEndCalledRef.current = false;

    desiredPlayRef.current = false;

    // Errors from the previous YouTube item must NEVER poison
    // controls for the new speech.
    playerErrorRef.current = false;
    setPlayerError(false);

    autoplayBootstrapDoneRef.current = false;
    autoplayBootstrapRunningRef.current = false;
    bootstrapIntentRef.current++; // cancel any in-flight bootstrap

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    const fetchVideoMetadata = async () => {
      console.log(`Fetching metadata for video: ${videoId}`);
      setIsLoading(true);
      setError(null);

      try {
        const backendUrl = getBackendUrl().replace(/\/$/, '');

        const response = await fetch(
          `${backendUrl}/api/youtube/video/${encodeURIComponent(videoId)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.details ||
            data?.error ||
            `Video metadata error: ${response.status}`
          );
        }

        const video = data?.video;

        if (!video) {
          throw new Error('Video metadata missing');
        }

        const parseDuration = (dur: string): number => {
          const match =
            dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

          if (!match) return 0;

          const hours = parseInt(match[1] || '0');
          const minutes = parseInt(match[2] || '0');
          const seconds = parseInt(match[3] || '0');

          return hours * 3600 + minutes * 60 + seconds;
        };

        const videoDuration =
          parseDuration(video.duration || 'PT0S');

        setDuration(videoDuration);

        if (mountedRef.current) {
          setMetadata({
            id: video.id,
            title: video.title || '',
            description: video.description || '',
            thumbnail: video.thumbnail || thumbnail || '',
            channelTitle: video.channelTitle || '',
            duration: videoDuration,
            viewCount: Number(video.viewCount || 0),
            publishedAt: video.publishedAt || '',
          });
        }

        console.log(
          'Video metadata fetched through backend:',
          video.title
        );

        setIsLoading(false);
      } catch (err: any) {
        console.error(
          'Error fetching video metadata:',
          err
        );

        if (mountedRef.current) {
          setError(
            err.message ||
            'Failed to fetch video data'
          );

          setIsLoading(false);

          onErrorRef.current?.(
            err.message ||
            'Failed to fetch video data'
          );
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

  // â”€â”€ ONE-SHOT autoplay bootstrap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Fires once per video after onPlayerReady. Performs a silent seek 0->1->0
  // to activate the native player, then issues a play command. Self-disables
  // via autoplayBootstrapDoneRef so it never runs again for that video.
  // If the user presses Pause while the bootstrap is in flight, the intent
  // ref is incremented and the async work bails out â€” no stale Play command.
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
    autoplayBootstrapDoneRef.current = true; // lock â€” never run again for this video
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

  // â”€â”€ Player ready handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onPlayerReady = useCallback(() => {
    if (!mountedRef.current) return;
    console.log('[Autoplay] YouTube player ready for video:', activeVideoIdRef.current);
    console.log('[Playback] onReady', videoId);
    setPlayerReady(true);
    playerHadReadyRef.current = true;
    setPlayerError(false);
    setError(null);

    try {
      if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
        void playerRef.current.getDuration().then((dur: number) => {
          if (dur > 0 && mountedRef.current) {
            console.log('[Autoplay] Duration from onReady:', dur);
            setDuration(dur);
            durationRef.current = dur;
          }
        }).catch((err: any) => {
          console.log('[Autoplay] Could not get duration on ready:', err);
        });
      }
    } catch (e) {
      console.log('[Autoplay] getDuration call failed:', e);
    }

    // ONE bootstrap per video â€” nothing else
    if (autoplay && !manualPauseRef.current) {
      void runAutoplayBootstrap();
    }
  }, [autoplay, videoId, runAutoplayBootstrap]);

  // â”€â”€ Player error handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onPlayerError = useCallback((errorMsg: string) => {
    console.error('YouTube player error:', errorMsg);
    if (!mountedRef.current) return;

    const recoverablePostAdError =
      adInterruptedVideoRef.current &&
      playerHadReadyRef.current;

    bootstrapIntentRef.current++;
    autoplayBootstrapRunningRef.current = false;

    setPlayerPlayCommand(false);
    setIsPlaying(false);
    isPlayingRef.current = false;
    stopProgressTracking();

    if (recoverablePostAdError) {
      // This video had already proven that the YouTube iframe was ready.
      // Ad interruptions can produce late native/WebView error callbacks.
      // Never allow one of those callbacks to permanently disable the
      // persistent global player.
      console.warn(
        '[Playback] treating post-ad YouTube error as transient:',
        errorMsg
      );

      playerErrorRef.current = false;
      setPlayerError(false);

      playerReadyRef.current = true;
      setPlayerReady(true);

      return;
    }

    // Genuine initial/unrecoverable load failure.
    playerErrorRef.current = true;
    setPlayerError(true);

    playerReadyRef.current = false;
    setPlayerReady(false);

    desiredPlayRef.current = false;
  }, [stopProgressTracking]);

  // â”€â”€ State change handler â€” AUTHORITATIVE for isPlayingRef â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Only this callback sets isPlayingRef. It NEVER issues new playback commands.
  const onStateChange = useCallback((state: string) => {
    if (!mountedRef.current) return;
    console.log('Player state:', state, 'for video:', activeVideoIdRef.current);
    console.log('[Manual Playback] YouTube state:', state);

    if (state === 'playing') {
      playerHadReadyRef.current = true;
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
      if (onEndCalledRef.current) {
        console.log('onEnd already called for this video, ignoring');
        return;
      }
      onEndCalledRef.current = true;

      isPlayingRef.current = false;
      setIsPlaying(false);
      onPlayingChangeRef.current?.(false);

      stopProgressTracking();
      clearCommandWatchdog();

      setCurrentTime(0);

      // ENDED is a hard lifecycle boundary. Any temporary state left by
      // a previously displayed ad belongs to the finished speech only.
      if (!playbackAdCoordinator.isAdActive) {
        temporarilyPausedForAdRef.current = false;
        wasPlayingBeforeAdRef.current = false;
      }

      desiredPlayRef.current = false;
      lastRequestedStateRef.current = false;
      manualPauseRef.current = false;
      autoplayBootstrapRunningRef.current = false;

      // Do not allow a transient YouTube error associated with this
      // finished speech to disable every speech loaded afterward.
      playerErrorRef.current = false;
      setPlayerError(false);

      console.log(
        'Video ended with playback state normalized, calling onEnd for:',
        activeVideoIdRef.current
      );
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
  }, [startProgressTracking, stopProgressTracking]);

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // â”€â”€ Manual play/pause button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Restored from working commit 08dce452: manual target toggle +
  // imperative command watchdog. No manual seek workarounds.
  const handlePlayPause = useCallback(() => {
  // Explicit user input is also a recovery action after an ad.
  // Clear an obsolete error rather than permanently disabling controls.
  if (playerError && !playbackAdCoordinator.isAdActive) {
    playerErrorRef.current = false;
    setPlayerError(false);
  }

  if (!playerReadyRef.current) {
    console.log('Player not ready for play/pause yet');
    return;
  }

  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  // An explicit user Play/Pause action is authoritative recovery.
  // If an ad already disappeared but temporary state somehow remained,
  // clear it so stale ad state can never brick future playback.
  if (!playbackAdCoordinator.isAdActive) {
    temporarilyPausedForAdRef.current = false;
  }

  // Toggle from the most recent requested user intent.
  // isPlayingRef is reserved for actual YouTube onStateChange events.
  // This makes rapid taps deterministic while still allowing the
  // watchdog to detect a command that YouTube failed to honor.
  const nextState = !desiredPlayRef.current;

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

  // Explicit user input supersedes any pending pre-ad resume.
  if (!playbackAdCoordinator.isAdActive) {
    wasPlayingBeforeAdRef.current = false;
    temporarilyPausedForAdRef.current = false;
  }

  // Optimistically update visible UI/controlled play prop, but do NOT
  // overwrite isPlayingRef. onStateChange owns the actual player state.
  setPlayerPlayCommand(nextState);
  setIsPlaying(nextState);
  onPlayingChangeRef.current?.(nextState);

  void requestPlayState(nextState);

  clearCommandWatchdog();
  commandWatchdogRef.current = setTimeout(() => {
    if (!mountedRef.current) return;

    const actual = isPlayingRef.current;

    if (actual !== nextState) {
      console.log(
        '[PlayPause] Watchdog retry imperative command:',
        nextState
      );
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
  clearCommandWatchdog,
  requestPlayState,
  sendNativeImperativeCommand,
  stopProgressTracking,
  startProgressTracking,
]);

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

  // â”€â”€ Web player â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const webIframeRef = useRef<HTMLIFrameElement | null>(null);
  const postMessageToWebPlayerRef = useRef<((command: string, args?: any) => void) | null>(null);
  const webPlayerReadyRef = useRef(false);
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
          console.log('[Web YT] Player ready for:', videoId);
          webPlayerReadyRef.current = true;
          if (!mountedRef.current) return;
          setPlayerReady(true);
          setPlayerError(false);
          setError(null);

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
          const state = data.info;
          if (state === 1) { // playing
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
          } else if (state === 2) { // paused
            isPlayingRef.current = false;
            setIsPlaying(false);
            onPlayingChangeRef.current?.(false);
            console.log('[Playback] actual state paused');
          } else if (state === 0) { // ended
            if (!onEndCalledRef.current) {
              onEndCalledRef.current = true;
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
  }, [videoId, autoplay, postMessageToWebPlayer]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (isPlaying) {
      postMessageToWebPlayer('playVideo');
    } else {
      postMessageToWebPlayer('pauseVideo');
    }
  }, [isPlaying, postMessageToWebPlayer]);

  // Reset web autoplay trigger on video change
  useEffect(() => {
    webAutoplayTriggeredRef.current = false;
  }, [videoId]);

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

  // Persistent global playback mode.
  // Keep the YouTube player mounted while suppressing the full player UI.
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

