import AsyncStorage from '@react-native-async-storage/async-storage';

const QUOTA_STORAGE_KEY = 'yt_quota_tracker';
const VIDEO_CACHE_KEY_PREFIX = 'yt_video_cache_';
const LAST_FETCH_KEY_PREFIX = 'yt_last_fetch_';

const DAILY_QUOTA_LIMIT = 10000;
const SEARCH_COST = 100;
const VIDEO_DETAILS_COST = 1;
const PLAYLIST_ITEMS_COST = 1;
const MAX_SEARCH_REQUESTS_PER_DAY = 80;
const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 3; // 3 hours
const MAX_FETCHES_PER_DAY = 10;

interface QuotaTracker {
  date: string;
  searchRequestCount: number;
  totalUnitsUsed: number;
  fetchCount: number;
  lastResetTimestamp: number;
}

interface CachedVideoEntry {
  videos: CachedVideo[];
  fetchedAt: number;
  category: string;
  query: string;
}

export interface CachedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  duration: number;
  viewCount: number;
  category: string;
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

async function getQuotaTracker(): Promise<QuotaTracker> {
  try {
    const stored = await AsyncStorage.getItem(QUOTA_STORAGE_KEY);
    if (stored) {
      const tracker: QuotaTracker = JSON.parse(stored);
      const today = getTodayDateString();
      if (tracker.date === today) {
        return tracker;
      }
      console.log('[QuotaManager] New day detected, resetting quota counter');
    }
  } catch (error) {
    console.error('[QuotaManager] Error reading quota tracker:', error);
  }

  const freshTracker: QuotaTracker = {
    date: getTodayDateString(),
    searchRequestCount: 0,
    totalUnitsUsed: 0,
    fetchCount: 0,
    lastResetTimestamp: Date.now(),
  };
  await saveQuotaTracker(freshTracker);
  return freshTracker;
}

async function saveQuotaTracker(tracker: QuotaTracker): Promise<void> {
  try {
    await AsyncStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(tracker));
  } catch (error) {
    console.error('[QuotaManager] Error saving quota tracker:', error);
  }
}

async function incrementQuota(searchRequests: number, detailRequests: number): Promise<void> {
  const tracker = await getQuotaTracker();
  tracker.searchRequestCount += searchRequests;
  tracker.totalUnitsUsed += (searchRequests * SEARCH_COST) + (detailRequests * VIDEO_DETAILS_COST);
  tracker.fetchCount += 1;
  await saveQuotaTracker(tracker);
  console.log(`[QuotaManager] Updated: ${tracker.searchRequestCount} searches, ${tracker.totalUnitsUsed} units used, ${tracker.fetchCount} fetches today`);
}

export async function canMakeSearchRequest(): Promise<boolean> {
  const tracker = await getQuotaTracker();

  if (tracker.searchRequestCount >= MAX_SEARCH_REQUESTS_PER_DAY) {
    console.log('[QuotaManager] ⚠️ Daily search request limit reached');
    return false;
  }

  if (tracker.totalUnitsUsed + SEARCH_COST > DAILY_QUOTA_LIMIT) {
    console.log('[QuotaManager] ⚠️ Daily quota unit limit would be exceeded');
    return false;
  }

  if (tracker.fetchCount >= MAX_FETCHES_PER_DAY) {
    console.log('[QuotaManager] ⚠️ Daily fetch count limit reached');
    return false;
  }

  return true;
}

export async function shouldRefreshContent(category: string): Promise<boolean> {
  try {
    const lastFetchKey = `${LAST_FETCH_KEY_PREFIX}${category}`;
    const stored = await AsyncStorage.getItem(lastFetchKey);
    if (!stored) return true;

    const lastFetchTime = parseInt(stored, 10);
    const elapsed = Date.now() - lastFetchTime;

    if (elapsed < REFRESH_INTERVAL_MS) {
      const minutesRemaining = Math.round((REFRESH_INTERVAL_MS - elapsed) / 60000);
      console.log(`[QuotaManager] Content for "${category}" still fresh. Next refresh in ${minutesRemaining} min`);
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

async function markContentRefreshed(category: string): Promise<void> {
  try {
    const lastFetchKey = `${LAST_FETCH_KEY_PREFIX}${category}`;
    await AsyncStorage.setItem(lastFetchKey, Date.now().toString());
  } catch (error) {
    console.error('[QuotaManager] Error marking content refreshed:', error);
  }
}

export async function getCachedVideos(category: string): Promise<CachedVideo[] | null> {
  try {
    const cacheKey = `${VIDEO_CACHE_KEY_PREFIX}${category}`;
    const stored = await AsyncStorage.getItem(cacheKey);
    if (!stored) return null;

    const entry: CachedVideoEntry = JSON.parse(stored);

    const today = getTodayDateString();
    const cachedDate = new Date(entry.fetchedAt).toISOString().split('T')[0];
    const isStale = cachedDate !== today && (Date.now() - entry.fetchedAt > 1000 * 60 * 60 * 24);

    if (isStale) {
      console.log(`[QuotaManager] Cache expired for "${category}"`);
      return null;
    }

    console.log(`[QuotaManager] ✅ Serving ${entry.videos.length} cached videos for "${category}"`);
    return entry.videos;
  } catch (error) {
    console.error('[QuotaManager] Error reading video cache:', error);
    return null;
  }
}

export async function setCachedVideos(category: string, videos: CachedVideo[], query: string): Promise<void> {
  try {
    const cacheKey = `${VIDEO_CACHE_KEY_PREFIX}${category}`;
    const entry: CachedVideoEntry = {
      videos,
      fetchedAt: Date.now(),
      category,
      query,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
    await markContentRefreshed(category);
    console.log(`[QuotaManager] Video cache updated for "${category}" with ${videos.length} videos`);
  } catch (error) {
    console.error('[QuotaManager] Error writing video cache:', error);
  }
}

export async function getQuotaStatus(): Promise<{
  searchesUsed: number;
  searchesRemaining: number;
  unitsUsed: number;
  unitsRemaining: number;
  fetchCount: number;
  canSearch: boolean;
}> {
  const tracker = await getQuotaTracker();
  return {
    searchesUsed: tracker.searchRequestCount,
    searchesRemaining: MAX_SEARCH_REQUESTS_PER_DAY - tracker.searchRequestCount,
    unitsUsed: tracker.totalUnitsUsed,
    unitsRemaining: DAILY_QUOTA_LIMIT - tracker.totalUnitsUsed,
    fetchCount: tracker.fetchCount,
    canSearch: tracker.searchRequestCount < MAX_SEARCH_REQUESTS_PER_DAY &&
              tracker.totalUnitsUsed + SEARCH_COST <= DAILY_QUOTA_LIMIT &&
              tracker.fetchCount < MAX_FETCHES_PER_DAY,
  };
}

export { incrementQuota, SEARCH_COST, VIDEO_DETAILS_COST, PLAYLIST_ITEMS_COST, REFRESH_INTERVAL_MS };
