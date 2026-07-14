/**
 * Multi-YouTube-API-key rotation utility.
 *
 * Supports comma-separated keys in YOUTUBE_API_KEY or EXPO_PUBLIC_YOUTUBE_API_KEY.
 * Keys are rotated on failure; quota-exhausted keys cool down for 15 minutes.
 */

export interface YouTubeKeyState {
  exhaustedUntil: number;
  failCount: number;
  lastUsed: number;
}

export const YOUTUBE_API_KEYS = (process.env.YOUTUBE_API_KEY || process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '')
  .split(',')
  .map((k) => k.trim())
  .filter((k) => k.length > 0);

const keyState = new Map<string, YouTubeKeyState>();
let currentIndex = 0;

export function getNextYouTubeKey(preferredIndex?: number): string | null {
  if (YOUTUBE_API_KEYS.length === 0) return null;
  const now = Date.now();
  const startIndex = preferredIndex ?? currentIndex;

  for (let i = 0; i < YOUTUBE_API_KEYS.length; i++) {
    const idx = (startIndex + i) % YOUTUBE_API_KEYS.length;
    const key = YOUTUBE_API_KEYS[idx];
    const state = keyState.get(key);
    if (!state || state.exhaustedUntil < now) {
      currentIndex = (idx + 1) % YOUTUBE_API_KEYS.length;
      keyState.set(key, {
        ...(state || { failCount: 0, exhaustedUntil: 0 }),
        lastUsed: now,
      });
      return key;
    }
  }

  // All keys appear exhausted; fall back to the first one and let it try again
  return YOUTUBE_API_KEYS[0];
}

export function markYouTubeKeyIssue(key: string, isQuota = false): void {
  const state = keyState.get(key) || { exhaustedUntil: 0, failCount: 0, lastUsed: 0 };
  state.failCount += 1;
  if (isQuota) {
    state.exhaustedUntil = Date.now() + 1000 * 60 * 15;
    console.log(`[YouTube] Key ${key.substring(0, 10)}... marked quota-exhausted for 15 min`);
  } else if (state.failCount > 3) {
    state.exhaustedUntil = Date.now() + 1000 * 60 * 5;
  }
  keyState.set(key, state);
}

export function isQuotaError(status: number, errorText: string): boolean {
  if (status !== 403) return false;
  const text = errorText.toLowerCase();
  return text.includes('quota') || text.includes('exceeded');
}

export function getYouTubeKeyCount(): number {
  return YOUTUBE_API_KEYS.length;
}
