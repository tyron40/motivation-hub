import React, { useRef, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { useSpeechContext } from '@/hooks/speech-context';
import { useAdMob } from '@/hooks/admob-context';
import AudioOnlyVideoPlayer from '@/components/AudioOnlyVideoPlayer';
import type { AudioOnlyVideoPlayerRef } from '@/components/AudioOnlyVideoPlayer';

/**
 * Globally-mounted YouTube player that persists across navigation.
 * Only renders the hidden YouTube player (no UI) so playback continues
 * when the user navigates away from the player screen or backgrounds the app.
 */
export default function GlobalYouTubePlayer() {
  const {
    currentSpeech,
    currentPlaylist,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    skipToNext,
    skipToPrevious,
    audioPlayerRef,
  } = useSpeechContext();

  const {
    showInterstitialAd,
    canShowAds,
    tryShowInterstitialOnTransition,
    isShowingAd,
  } = useAdMob();

  const localPlayerRef = useRef<AudioOnlyVideoPlayerRef>(null);
  const midpointAdShownRef = useRef(false);
  const quarterAdShownRef = useRef(false);
  const openAdShownRef = useRef(false);
  const onEndLockedRef = useRef(false);
  const adSessionRef = useRef(false);

  const youtubeId = currentSpeech?.youtubeId ?? null;

  // ── Callback ref: assigns both local and shared refs immediately ───────
  const setPlayerRef = useCallback(
    (instance: AudioOnlyVideoPlayerRef | null) => {
      localPlayerRef.current = instance;
      audioPlayerRef.current = instance;
    },
    [audioPlayerRef],
  );

  // ── Reset ad tracking when speech changes ──────────────────────────────
  useEffect(() => {
    midpointAdShownRef.current = false;
    quarterAdShownRef.current = false;
    openAdShownRef.current = false;
    onEndLockedRef.current = false;
    adSessionRef.current = false;
  }, [youtubeId]);

  // ── Ensure background audio mode ───────────────────────────────────────
  useEffect(() => {
    if (youtubeId && Platform.OS !== 'web') {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      }).catch(() => {});
    }
  }, [youtubeId]);

  // ── Show interstitial when player first opens ──────────────────────────
  useEffect(() => {
    if (youtubeId && !openAdShownRef.current && canShowAds) {
      openAdShownRef.current = true;
      void tryShowInterstitialOnTransition();
    }
  }, [youtubeId, canShowAds, tryShowInterstitialOnTransition]);

  // ── Ad pause/resume — single authoritative path via isShowingAd ────────
  useEffect(() => {
    if (isShowingAd) {
      localPlayerRef.current?.pauseForAd();
    } else {
      localPlayerRef.current?.resumeAfterAd();
    }
  }, [isShowingAd]);

  const handlePlayingChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, [setIsPlaying]);

  const handleProgressChange = useCallback((time: number, dur: number) => {
    setCurrentTime(time);
    if (dur > 0) setDuration(dur);

    if (adSessionRef.current) return;
    if (canShowAds && dur > 0) {
      const progress = time / dur;
      if (!quarterAdShownRef.current && dur >= 120 && progress >= 0.25 && progress < 0.30) {
        quarterAdShownRef.current = true;
        void showInterstitialAd();
      }
      if (!midpointAdShownRef.current && dur >= 60 && progress >= 0.5 && progress < 0.55) {
        midpointAdShownRef.current = true;
        void showInterstitialAd();
      }
    }
  }, [setCurrentTime, setDuration, canShowAds, showInterstitialAd]);

  const handleEnd = useCallback(async () => {
    if (onEndLockedRef.current) return;
    onEndLockedRef.current = true;
    midpointAdShownRef.current = false;
    quarterAdShownRef.current = false;
    try {
      if (canShowAds) {
        try { await tryShowInterstitialOnTransition(); } catch {}
      }
      skipToNext();
    } finally {
      // Always release the lock — even if skipToNext throws — so the
      // next speech's own onEnd can never be permanently blocked.
      setTimeout(() => { onEndLockedRef.current = false; }, 2000);
    }
  }, [canShowAds, tryShowInterstitialOnTransition, skipToNext]);

  const handleNext = useCallback(() => {
    if (currentPlaylist.length > 1) skipToNext();
  }, [currentPlaylist.length, skipToNext]);

  const handlePrevious = useCallback(() => {
    if (currentPlaylist.length > 1) skipToPrevious();
  }, [currentPlaylist.length, skipToPrevious]);

  if (!youtubeId) return null;

  return (
    <AudioOnlyVideoPlayer
      ref={setPlayerRef}
      videoId={youtubeId}
      title={currentSpeech!.title}
      thumbnail={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
      channelTitle={currentSpeech!.speaker}
      autoplay={true}
      hideUI={true}
      onError={(error: string) => console.error('Global YouTube player error:', error)}
      onEnd={handleEnd}
      onNext={currentPlaylist.length > 1 ? handleNext : undefined}
      onPrevious={currentPlaylist.length > 1 ? handlePrevious : undefined}
      onPlayingChange={handlePlayingChange}
      onProgressChange={handleProgressChange}
    />
  );
}
