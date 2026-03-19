import { useEffect, useRef, useCallback } from 'react';
import { AD_CONFIG } from '@/constants/admob';
import { useAdMob } from '@/hooks/admob-context';

interface UsePlaybackAdTimerOptions {
  isPlaying: boolean;
  currentTime: number;
  enabled?: boolean;
}

export function usePlaybackAdTimer({
  isPlaying,
  currentTime,
  enabled = true,
}: UsePlaybackAdTimerOptions) {
  const { showInterstitialAd, canShowAds, isShowingAd } = useAdMob();
  const lastAdTimeRef = useRef<number>(0);
  const hasTriggeredRef = useRef<Set<number>>(new Set());

  const intervalSeconds = AD_CONFIG.PLAYBACK_AD_INTERVAL_SECONDS;

  const checkAndShowAd = useCallback(async () => {
    if (!enabled || !canShowAds || isShowingAd || !isPlaying) return;

    const currentCheckpoint = Math.floor(currentTime / intervalSeconds);
    if (currentCheckpoint < 1) return;

    if (hasTriggeredRef.current.has(currentCheckpoint)) return;

    const timeSinceLastAd = currentTime - lastAdTimeRef.current;
    if (timeSinceLastAd < intervalSeconds) return;

    hasTriggeredRef.current.add(currentCheckpoint);
    console.log(`📺 [PlaybackAdTimer] Triggering interstitial at ${Math.floor(currentTime)}s (checkpoint ${currentCheckpoint})`);

    const shown = await showInterstitialAd();
    if (shown) {
      lastAdTimeRef.current = currentTime;
      console.log(`📺 [PlaybackAdTimer] Ad shown at ${Math.floor(currentTime)}s`);
    } else {
      console.log(`📺 [PlaybackAdTimer] Ad not available at ${Math.floor(currentTime)}s, will retry next checkpoint`);
      hasTriggeredRef.current.delete(currentCheckpoint);
    }
  }, [enabled, canShowAds, isShowingAd, isPlaying, currentTime, intervalSeconds, showInterstitialAd]);

  useEffect(() => {
    if (isPlaying && currentTime > 0) {
      void checkAndShowAd();
    }
  }, [isPlaying, currentTime, checkAndShowAd]);

  const resetTimer = useCallback(() => {
    lastAdTimeRef.current = 0;
    hasTriggeredRef.current.clear();
    console.log('📺 [PlaybackAdTimer] Timer reset');
  }, []);

  return { resetTimer };
}
