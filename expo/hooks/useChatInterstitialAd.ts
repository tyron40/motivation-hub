import { useRef, useCallback, useEffect } from 'react';
import { useAdMob } from '@/hooks/admob-context';

interface ChatAdState {
  messagesSent: number;
  lastInteractionTime: number;
  isUserTyping: boolean;
  isMessageSending: boolean;
  lastAdShownTime: number;
  messagesSinceLastAd: number;
}

const MIN_MESSAGES_BEFORE_AD = 5;
const MIN_IDLE_SECONDS = 10;
const MIN_AD_INTERVAL_MS = 2 * 60 * 1000;
const MIN_MESSAGES_BETWEEN_ADS = 5;

export function useChatInterstitialAd() {
  const { showInterstitialAd, canShowAds, isShowingAd } = useAdMob();
  const stateRef = useRef<ChatAdState>({
    messagesSent: 0,
    lastInteractionTime: Date.now(),
    isUserTyping: false,
    isMessageSending: false,
    lastAdShownTime: 0,
    messagesSinceLastAd: 0,
  });
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearIdleTimer();
  }, [clearIdleTimer]);

  const canTriggerAd = useCallback((): boolean => {
    const s = stateRef.current;
    if (!canShowAds || isShowingAd) return false;
    if (s.isUserTyping || s.isMessageSending) return false;
    if (s.messagesSent < MIN_MESSAGES_BEFORE_AD) return false;
    if (s.messagesSinceLastAd < MIN_MESSAGES_BETWEEN_ADS) return false;

    const now = Date.now();
    const idleMs = now - s.lastInteractionTime;
    if (idleMs < MIN_IDLE_SECONDS * 1000) return false;

    if (s.lastAdShownTime > 0 && (now - s.lastAdShownTime) < MIN_AD_INTERVAL_MS) return false;

    return true;
  }, [canShowAds, isShowingAd]);

  const tryShowAd = useCallback(async () => {
    if (!canTriggerAd()) return;

    console.log('📺 [ChatAd] Showing interstitial after idle period');
    const shown = await showInterstitialAd();
    if (shown) {
      stateRef.current.lastAdShownTime = Date.now();
      stateRef.current.messagesSinceLastAd = 0;
      stateRef.current.lastInteractionTime = Date.now();
      console.log('📺 [ChatAd] Ad shown, counters reset');
    }
  }, [canTriggerAd, showInterstitialAd]);

  const startIdleTimer = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      void tryShowAd();
    }, MIN_IDLE_SECONDS * 1000);
  }, [clearIdleTimer, tryShowAd]);

  const recordMessageSent = useCallback(() => {
    stateRef.current.messagesSent += 1;
    stateRef.current.messagesSinceLastAd += 1;
    stateRef.current.lastInteractionTime = Date.now();
    stateRef.current.isMessageSending = true;
    clearIdleTimer();
    console.log(`📺 [ChatAd] Message sent. Total: ${stateRef.current.messagesSent}, Since last ad: ${stateRef.current.messagesSinceLastAd}`);
  }, [clearIdleTimer]);

  const recordMessageComplete = useCallback(() => {
    stateRef.current.isMessageSending = false;
    stateRef.current.lastInteractionTime = Date.now();
    startIdleTimer();
  }, [startIdleTimer]);

  const setTyping = useCallback((typing: boolean) => {
    stateRef.current.isUserTyping = typing;
    stateRef.current.lastInteractionTime = Date.now();
    if (typing) {
      clearIdleTimer();
    } else {
      startIdleTimer();
    }
  }, [clearIdleTimer, startIdleTimer]);

  const recordInteraction = useCallback(() => {
    stateRef.current.lastInteractionTime = Date.now();
    clearIdleTimer();
    startIdleTimer();
  }, [clearIdleTimer, startIdleTimer]);

  return {
    recordMessageSent,
    recordMessageComplete,
    setTyping,
    recordInteraction,
    isShowingAd,
  };
}
