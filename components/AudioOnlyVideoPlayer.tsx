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

// YouTube IFrame API requires a player viewport of at least 200x200.
// The native player is hosted at 220x220 but visually hidden.
const NATIVE_PLAYER_SIZE = 220;

/**
 * PLAYBACK STATE MODEL — exactly three concepts:
 *
 * 1. webViewReady   WebView LIFETIME readiness (onReady fires once per
 *                   WebView load). Once true it is NEVER reset — changing
 *                   videos never requires a second onReady, so controls can
 *                   never become permanently disabled by a video change.
 * 2. wantPlaying    User/app intent. The ONLY thing that drives the
 *                   YoutubePlayer `play` prop. Never written by YouTube
 *                   state callbacks.
 * 3. actualPlaying  What YouTube reports via onChangeState. Display only.
 *                   Never issues playback commands.
 *
 * Per-video data (currentTime, duration, onEndCalled, videoLoading, the
 * one-shot autoplay bootstrap) resets on videoId change. Everything above
 * survives it.
 */
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
  const [webViewReady, setWebViewReady] = useState(false);
  const [wantPlaying, setWantPlaying] = useState(false);
  const [actualPlaying, setActualPlaying] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────
  const playerRef = useRef<any>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const mountedRef = useRef(true);

  // Ref mirrors of the three state concepts (imperative handle reads).
  const webViewReadyRef = useRef(false);
  const wantPlayingRef = useRef(false);
  const actualPlayingRef = useRef(false);

  // Per-video bookkeeping.
  const onEndCalledRef = useRef(false);
  const durationRef = useRef(0);
  const currentTimeRef = useRef(0);
  const isSeekingRef = useRef(isSeeking);
  const videoEpochRef = useRef(0);
  const videoChangedAtRef = useRef(0);
  const bootstrapDoneRef = useRef(false);

  // Ad interruption (owned by pauseForAd/resumeAfterAd only).
  const wasPlayingBeforeAdRef = useRef(false);
  const adPausedAtEpochRef = useRef(-1);

  // Manual pause intent, so a video change preserves the user's pause.
  const userPausedRef = useRef(false);

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
  useEffect(() => { isSeekingRef.current = isSeeking; }, [isSeeking]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Progress tracking ───────────────────────────────────────────────────
  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    progressInterval.current = setInterval(() => {
      if (playerRef.current && !isSeekingRef.current && webViewReadyRef.current && mountedRef.current) {
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

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, []);

  // ── Intent application — the ONLY writer of wantPlaying ─────────────────
  const applyWantPlaying = useCallback((next: boolean) => {
    console.log('[Playback] wantPlaying ->', next);
    wantPlayingRef.current = next;
    setWantPlaying(next);
  }, []);

  // ONE controlled prop edge (true -> false -> true) for the rare case the
  // WebView ignored a command while the play prop already equals intent.
  // Cancellation: epoch guard, mount guard, and user-intent guard.
  const reissuePlayCommand = useCallback(() => {
    const epoch = videoEpochRef.current;
    console.log('[Playback] re-issuing play command via prop edge');
    setWantPlaying(false);
    setTimeout(() => {
      if (!mountedRef.current) return;
      if (videoEpochRef.current !== epoch) return;
      if (wantPlayingRef.current !== true) return;
      setWantPlaying(true);
    }, 150);
  }, []);

  // ── ONE-SHOT autoplay bootstrap per video ───────────────────────────────
  // A single silent 0 -> 1 -> 0 seek right after the video is accepted,
  // historically required to activate iOS autoplay. It only ever STARTS
  // playback once; it is not a playback state manager and it can never run
  // after a manual pause or after the video has changed.
  const scheduleAutoplayBootstrap = useCallback(() => {
    if (Platform.OS === 'web') return;
    if (!autoplay) return;
    if (bootstrapDoneRef.current) return;
    bootstrapDoneRef.current = true;
    const epoch = videoEpochRef.current;

    setTimeout(() => {
      if (!mountedRef.current) return;
      if (videoEpochRef.current !== epoch) return;   // video changed
      if (!webViewReadyRef.current) return;
      if (!wantPlayingRef.current) return;           // ad pause / no autoplay
      if (userPausedRef.current) return;             // manual pause wins
      if (!playerRef.current || typeof playerRef.current.seekTo !== 'function') return;

      console.log('[Playback] autoplay bootstrap seek');
      try {
        const first = playerRef.current.seekTo(1, true);
        const back = () => {
          if (mountedRef.current && videoEpochRef.current === epoch) {
            try { void playerRef.current?.seekTo(0, true); } catch {}
          }
        };
        if (first && typeof first.then === 'function') first.then(back).catch(() => {});
        else back();
      } catch (e) {
        console.log('[Playback] bootstrap seek failed', e);
      }
    }, 350);
  }, [autoplay]);

  // ── Manual play/pause commands (shared by UI button and handle) ─────────
  const playNow = useCallback(() => {
    if (!webViewReadyRef.current) return;
    if (actualPlayingRef.current) return;
    userPausedRef.current = false;
    const hadIntent = wantPlayingRef.current;
    applyWantPlaying(true);
    // The prop already equalled intent (e.g. a post-ad WebView that ignored
    // the command) — force ONE controlled edge so the command is delivered.
    if (hadIntent) reissuePlayCommand();
  }, [applyWantPlaying, reissuePlayCommand]);

  const pauseNow = useCallback(() => {
    if (!webViewReadyRef.current) return;
    userPausedRef.current = true;
    applyWantPlaying(false);
  }, [applyWantPlaying]);

  // ── Imperative handle ──────────────────────────────────────────────────
  // Gated ONLY on WebView lifetime readiness — never on per-video loading,
  // never on transient errors.
  useImperativeHandle(ref, () => ({
    togglePlay: () => {
      if (actualPlayingRef.current) pauseNow();
      else playNow();
    },
    play: playNow,
    pause: pauseNow,
    pauseForAd: () => {
      // Capture intent BEFORE pausing. Includes the not-yet-started
      // autoplay case so an ad shown during startup still resumes.
      wasPlayingBeforeAdRef.current =
        actualPlayingRef.current || wantPlayingRef.current;
      adPausedAtEpochRef.current = videoEpochRef.current;
      applyWantPlaying(false);
      // An ad pause is NOT user intent — userPausedRef is untouched.
    },
    resumeAfterAd: () => {
      const shouldResume = wasPlayingBeforeAdRef.current;
      const adEpoch = adPausedAtEpochRef.current;
      wasPlayingBeforeAdRef.current = false;
      adPausedAtEpochRef.current = -1;
      if (!shouldResume) return;
      if (!webViewReadyRef.current) return;
      if (adEpoch !== videoEpochRef.current) return; // ad spanned a video change
      if (userPausedRef.current) return;             // user paused during the ad
      // Edge guaranteed: pauseForAd set the prop to false.
      applyWantPlaying(true);
    },
    seekForward: (seconds = 15) => {
      if (!webViewReadyRef.current || !playerRef.current) return;
      const newPos = Math.min(currentTimeRef.current + seconds, durationRef.current);
      void playerRef.current.seekTo(newPos, true);
      setCurrentTime(newPos);
    },
    seekBackward: (seconds = 15) => {
      if (!webViewReadyRef.current || !playerRef.current) return;
      const newPos = Math.max(currentTimeRef.current - seconds, 0);
      void playerRef.current.seekTo(newPos, true);
      setCurrentTime(newPos);
    },
    seekTo: async (position: number) => {
      if (!webViewReadyRef.current || !playerRef.current) return;
      try {
        await playerRef.current.seekTo(position, true);
        setCurrentTime(position);
      } catch (err) {
        console.error('Error seeking:', err);
      }
    },
    getIsPlaying: () => actualPlayingRef.current,
  }), [playNow, pauseNow, applyWantPlaying, reissuePlayCommand]);

  // ── Pulse animation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (actualPlaying) {
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
  }, [actualPlaying, pulseAnim]);

  // ── Video change: reset PER-VIDEO state only ────────────────────────────
  // webViewReady / wantPlaying intent survive; a second onReady is never
  // required, so controls can never lock up across speeches.
  useEffect(() => {
    console.log('[Playback] videoId changed:', videoId);
    videoEpochRef.current++;
    videoChangedAtRef.current = Date.now();
    onEndCalledRef.current = false;
    bootstrapDoneRef.current = false;
    wasPlayingBeforeAdRef.current = false;
    adPausedAtEpochRef.current = -1;
    stopProgressTracking();

    actualPlayingRef.current = false;
    setActualPlaying(false);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setDuration(0);
    durationRef.current = 0;
    setError(null);
    setVideoLoading(true);

    // Deterministic autoplay intent for the NEW video (Part: Next must
    // always recover). The user's manual pause is preserved; anything else
    // that was playing (or autoplay) keeps playing.
    if (userPausedRef.current) {
      applyWantPlaying(false);
    } else if (autoplay || wantPlayingRef.current) {
      applyWantPlaying(true);
      if (webViewReadyRef.current) {
        scheduleAutoplayBootstrap();
      }
    }

    if (!videoId) return;

    const fetchVideoMetadata = async () => {
      try {
        const apiKey = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
        if (!apiKey) {
          console.log('[Playback] No YouTube API key, using props');
          if (mountedRef.current) setVideoLoading(false);
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
          // Success path must also clear the per-video loading state —
          // relying on a second onReady here was the permanent-lock bug.
          setVideoLoading(false);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          console.warn('[Playback] metadata fetch timed out, using props');
        } else {
          console.warn('[Playback] metadata fetch failed, using props:', err?.message);
        }
        if (mountedRef.current) {
          setVideoLoading(false);
        }
      }
    };

    void fetchVideoMetadata();
  }, [videoId, autoplay, applyWantPlaying, scheduleAutoplayBootstrap, stopProgressTracking]);

  // ── Player ready handler (native) ────────────────────────────────────────
  // Fires ONCE per WebView load. Marks the WebView as ready FOR LIFE.
  const onPlayerReady = useCallback(() => {
    if (!mountedRef.current) return;
    console.log('[Playback] YouTube onReady fired for:', videoId);
    webViewReadyRef.current = true;
    setWebViewReady(true);
    setError(null);
    setVideoLoading(false);

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

    scheduleAutoplayBootstrap();
  }, [videoId, scheduleAutoplayBootstrap]);

  // ── Player error handler ────────────────────────────────────────────────
  // Only a WebView that has NEVER been ready can fail fatally. Once the
  // WebView has worked, every later iframe error is transient (typically an
  // ad suspending the WebView) and must never disable controls.
  const onPlayerError = useCallback((errorMsg: string) => {
    console.error('[Playback] YouTube player error:', errorMsg);
    if (!mountedRef.current) return;

    if (!webViewReadyRef.current) {
      // Genuine initial failure — fatal, but a NEW video still recovers.
      setError(errorMsg);
      actualPlayingRef.current = false;
      setActualPlaying(false);
      onPlayingChangeRef.current?.(false);
      stopProgressTracking();
      onErrorRef.current?.(errorMsg);
      return;
    }

    console.log('[Playback] transient player error ignored (player stays usable):', errorMsg);
    if (actualPlayingRef.current) {
      actualPlayingRef.current = false;
      setActualPlaying(false);
      onPlayingChangeRef.current?.(false);
    }
    stopProgressTracking();
  }, [stopProgressTracking]);

  // ── State change handler — AUTHORITATIVE for actualPlaying only ─────────
  // This callback NEVER issues playback commands and NEVER writes the play
  // prop: intent (wantPlaying) and reality (actualPlaying) stay independent.
  const onStateChange = useCallback((state: PlayerState) => {
    if (!mountedRef.current) return;
    console.log('[Playback] YouTube state:', state);

    if (state === 'playing') {
      actualPlayingRef.current = true;
      setActualPlaying(true);
      setVideoLoading(false);
      onPlayingChangeRef.current?.(true);
      startProgressTracking();
      return;
    }

    if (state === 'paused') {
      actualPlayingRef.current = false;
      setActualPlaying(false);
      setVideoLoading(false);
      onPlayingChangeRef.current?.(false);
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
      actualPlayingRef.current = false;
      setActualPlaying(false);
      onPlayingChangeRef.current?.(false);
      stopProgressTracking();
      // wantPlaying intentionally stays true: the next speech autoplays.
      setTimeout(() => {
        if (mountedRef.current) {
          onEndRef.current?.();
        }
      }, 100);
      return;
    }

    if (state === 'buffering') {
      setVideoLoading(true);
      stopProgressTracking();
    }

    if (state === 'unstarted') {
      setVideoLoading(false);
    }
  }, [startProgressTracking, stopProgressTracking]);

  // ── Manual play/pause button ────────────────────────────────────────────
  // Pure intent: flip wantPlaying. The prop edge carries the command.
  const handlePlayPause = useCallback(() => {
    if (!webViewReadyRef.current) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (actualPlayingRef.current) pauseNow();
    else playNow();
  }, [pauseNow, playNow]);

  const handleSkipForward = useCallback(async () => {
    if (!webViewReadyRef.current || !playerRef.current) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const newPosition = Math.min(currentTimeRef.current + 15, durationRef.current);
      await playerRef.current.seekTo(newPosition, true);
      setCurrentTime(newPosition);
      onProgressChangeRef.current?.(newPosition, durationRef.current);
    } catch (err) {
      console.error('Error skipping forward:', err);
    }
  }, []);

  const handleSkipBackward = useCallback(async () => {
    if (!webViewReadyRef.current || !playerRef.current) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const newPosition = Math.max(currentTimeRef.current - 15, 0);
      await playerRef.current.seekTo(newPosition, true);
      setCurrentTime(newPosition);
      onProgressChangeRef.current?.(newPosition, durationRef.current);
    } catch (err) {
      console.error('Error skipping backward:', err);
    }
  }, []);

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
    if (!webViewReadyRef.current) return;
    setCurrentTime(value);
  }, []);

  const handleSliderComplete = useCallback(async (value: number) => {
    if (!webViewReadyRef.current || !playerRef.current) return;
    try {
      await playerRef.current.seekTo(value, true);
      setIsSeeking(false);
      onProgressChangeRef.current?.(value, durationRef.current);
    } catch (err) {
      console.error('Error seeking:', err);
      setIsSeeking(false);
    }
  }, []);

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
          webViewReadyRef.current = true;
          setWebViewReady(true);
          setError(null);
          setVideoLoading(false);

          if (autoplay && !webAutoplayTriggeredRef.current) {
            webAutoplayTriggeredRef.current = true;
            applyWantPlaying(true);
            setTimeout(() => {
              if (mountedRef.current) {
                postMessageToWebPlayer('playVideo');
              }
            }, 300);
          }
        } else if (data.event === 'onStateChange') {
          const stateCode = data.info;
          if (stateCode === 1) { // playing
            actualPlayingRef.current = true;
            setActualPlaying(true);
            onPlayingChangeRef.current?.(true);
            if (!webProgressIntervalRef.current) {
              webProgressIntervalRef.current = setInterval(() => {
                postMessageToWebPlayer('getCurrentTime');
                postMessageToWebPlayer('getDuration');
              }, 500);
            }
          } else if (stateCode === 2) { // paused
            actualPlayingRef.current = false;
            setActualPlaying(false);
            onPlayingChangeRef.current?.(false);
          } else if (stateCode === 0) { // ended
            actualPlayingRef.current = false;
            setActualPlaying(false);
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
  }, [videoId, autoplay, postMessageToWebPlayer, applyWantPlaying]);

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
        play={wantPlaying}
        mute={false}
        volume={100}
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

  // Fatal: the WebView never became ready. The hidden player stays mounted,
  // so moving to another speech (Next) still recovers.
  if (error) {
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
          {actualPlaying ? (
            <View style={styles.nowPlayingIndicator}>
              <View style={[styles.soundBar, styles.soundBar1]} />
              <View style={[styles.soundBar, styles.soundBar2]} />
              <View style={[styles.soundBar, styles.soundBar3]} />
              <View style={[styles.soundBar, styles.soundBar4]} />
            </View>
          ) : videoLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : null}
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
          maximumValue={Math.max(duration, 1)}
          value={currentTime}
          onValueChange={handleSliderChange}
          onSlidingStart={() => setIsSeeking(true)}
          onSlidingComplete={handleSliderComplete}
          minimumTrackTintColor="#667eea"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#FFFFFF"
          disabled={!webViewReady}
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
          style={[styles.seekButton, !webViewReady && styles.buttonDisabled]}
          disabled={!webViewReady}
          activeOpacity={0.7}
        >
          <RotateCcw size={20} color="#FFFFFF" />
          <Text style={styles.seekLabel}>15</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePlayPause}
          style={styles.playButton}
          activeOpacity={0.8}
          disabled={!webViewReady}
        >
          {!webViewReady ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : actualPlaying ? (
            <Pause size={32} color="#000000" fill="#000000" />
          ) : (
            <Play size={32} color="#000000" fill="#000000" style={{ marginLeft: 3 }} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => void handleSkipForward()}
          style={[styles.seekButton, !webViewReady && styles.buttonDisabled]}
          disabled={!webViewReady}
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
