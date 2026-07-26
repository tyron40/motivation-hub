import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '@/lib/config';

const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 3; // 3 hours
const MAX_FETCHES_PER_DAY = 30;

const STORAGE_KEYS = {
  VIDEO_CACHE: 'yt_video_cache_',
  LAST_REFRESH: 'yt_last_refresh_',
  FETCH_COUNT: 'yt_fetch_count',
} as const;

interface FetchCounter {
  date: string;
  count: number;
}

interface CachedVideoData {
  videos: CachedVideo[];
  timestamp: number;
  category: string;
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
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function getFetchCount(): Promise<FetchCounter> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.FETCH_COUNT);
    if (stored) {
      const counter: FetchCounter = JSON.parse(stored);
      if (counter.date === getTodayDateString()) {
        return counter;
      }
    }
  } catch (error) {
    console.error('Error reading fetch counter:', error);
  }
  const fresh: FetchCounter = { date: getTodayDateString(), count: 0 };
  await AsyncStorage.setItem(STORAGE_KEYS.FETCH_COUNT, JSON.stringify(fresh));
  return fresh;
}

async function recordFetch(): Promise<void> {
  const counter = await getFetchCount();
  counter.count += 1;
  await AsyncStorage.setItem(STORAGE_KEYS.FETCH_COUNT, JSON.stringify(counter));
  console.log(`YouTube fetch count: ${counter.count}/${MAX_FETCHES_PER_DAY}`);
}

async function canFetchMore(): Promise<boolean> {
  const counter = await getFetchCount();
  if (counter.count >= MAX_FETCHES_PER_DAY) {
    console.log('Daily fetch limit reached – using cached content');
    return false;
  }
  return true;
}

async function shouldRefresh(category: string): Promise<boolean> {
  try {
    const lastRefreshStr = await AsyncStorage.getItem(`${STORAGE_KEYS.LAST_REFRESH}${category}`);
    if (!lastRefreshStr) return true;

    const lastRefresh = parseInt(lastRefreshStr, 10);
    const elapsed = Date.now() - lastRefresh;
    const shouldDo = elapsed >= REFRESH_INTERVAL_MS;

    if (!shouldDo) {
      const minutesUntil = Math.round((REFRESH_INTERVAL_MS - elapsed) / 60000);
      console.log(`Skipping refresh for "${category}" – next in ${minutesUntil} min`);
    }

    return shouldDo;
  } catch {
    return true;
  }
}

async function markRefreshed(category: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${STORAGE_KEYS.LAST_REFRESH}${category}`, String(Date.now()));
  } catch (error) {
    console.error('Error marking refresh:', error);
  }
}

async function getCachedVideos(category: string): Promise<CachedVideo[] | null> {
  try {
    const stored = await AsyncStorage.getItem(`${STORAGE_KEYS.VIDEO_CACHE}${category}`);
    if (!stored) return null;

    const cached: CachedVideoData = JSON.parse(stored);
    const age = Date.now() - cached.timestamp;
    const maxAge = 1000 * 60 * 60 * 24; // 24 hours

    if (age > maxAge) {
      console.log(`Cache expired for "${category}" (${Math.round(age / 3600000)}h old)`);
      return null;
    }

    console.log(`Serving ${cached.videos.length} cached videos for "${category}"`);
    return cached.videos;
  } catch (error) {
    console.error('Error reading video cache:', error);
    return null;
  }
}

async function setCachedVideos(category: string, videos: CachedVideo[]): Promise<void> {
  try {
    const data: CachedVideoData = {
      videos,
      timestamp: Date.now(),
      category,
    };
    await AsyncStorage.setItem(`${STORAGE_KEYS.VIDEO_CACHE}${category}`, JSON.stringify(data));
    console.log(`Video cache updated – ${videos.length} videos for "${category}"`);
  } catch (error) {
    console.error('Error writing video cache:', error);
  }
}

async function fetchFromBackend(
  endpointUrl: string,
  body: Record<string, unknown>,
  maxRetries: number = 3
): Promise<CachedVideo[]> {
  let lastError: string = '';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 8000);
        console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} for ${endpointUrl} after ${delay}ms`);
        await new Promise<void>(r => setTimeout(r, delay));
      } else {
        console.log(`Fetching from backend: ${endpointUrl}`, JSON.stringify(body));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        mode: 'cors' as RequestMode,
        credentials: 'omit' as RequestCredentials,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error body');
        console.error(`Backend ${endpointUrl} error (attempt ${attempt + 1}):`, response.status, errorText.substring(0, 200));
        lastError = `HTTP ${response.status}`;
        continue;
      }

      const data = await response.json();
      const videos: CachedVideo[] = (data.videos || []).map((v: any) => ({
        id: v.id ?? '',
        title: v.title ?? '',
        description: v.description ?? '',
        thumbnail: v.thumbnail ?? '',
        channelTitle: v.channelTitle ?? '',
        channelId: v.channelId ?? '',
        publishedAt: v.publishedAt ?? '',
        duration: v.duration ?? 0,
        viewCount: v.viewCount ?? 0,
        category: v.category ?? '',
      }));

      console.log(`Backend ${endpointUrl} returned ${videos.length} videos`);
      return videos;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        lastError = 'timeout';
        console.error(`Backend ${endpointUrl} timed out (attempt ${attempt + 1})`);
      } else {
        lastError = error?.message || String(error);
        console.error(`Backend ${endpointUrl} fetch error (attempt ${attempt + 1}):`, lastError);
      }
    }
  }

  console.error(`Backend ${endpointUrl} failed after ${maxRetries} attempts: ${lastError}`);
  return [];
}

async function mergeDedupVideos(...groups: CachedVideo[][]): Promise<CachedVideo[]> {
  const seen = new Set<string>();
  const merged: CachedVideo[] = [];
  for (const group of groups) {
    for (const v of group) {
      if (!v?.id || seen.has(v.id)) continue;
      seen.add(v.id);
      merged.push(v);
    }
  }
  return merged;
}

async function fetchCategoryFromBackend(category: string, limit: number): Promise<CachedVideo[]> {
  const [categoryPrimary, categorySearchFallback] = await Promise.all([
    fetchFromBackend(API_ENDPOINTS.youtubeCategory, { category, limit }),
    fetchFromBackend(API_ENDPOINTS.youtubeSearch, { query: category, limit }),
  ]);
  const merged = await mergeDedupVideos(categoryPrimary, categorySearchFallback);
  return merged.slice(0, limit);
}

async function fetchSearchFromBackend(query: string, limit: number): Promise<CachedVideo[]> {
  return fetchFromBackend(API_ENDPOINTS.youtubeSearch, { query, limit });
}

async function fetchTrendingFromBackend(limit: number): Promise<CachedVideo[]> {
  const [trendingPrimary, motivationFallback] = await Promise.all([
    fetchFromBackend(API_ENDPOINTS.youtubeTrending, { limit }),
    fetchFromBackend(API_ENDPOINTS.youtubeCategory, { category: 'motivation', limit }),
  ]);
  const merged = await mergeDedupVideos(trendingPrimary, motivationFallback);
  return merged.slice(0, limit);
}

export const YouTubeContentManager = {
  async getVideosForCategory(category: string, limit: number = 50): Promise<CachedVideo[]> {
    const normalizedCategory = category.toLowerCase().trim();

    const cached = await getCachedVideos(normalizedCategory);

    if (cached && cached.length > 0) {
      const needsRefresh = await shouldRefresh(normalizedCategory);
      if (!needsRefresh) {
        return cached.slice(0, limit);
      }

      const canFetch = await canFetchMore();
      if (!canFetch) {
        return cached.slice(0, limit);
      }

      this.refreshCategoryInBackground(normalizedCategory, limit).catch(() => {});
      return cached.slice(0, limit);
    }

    return await this.fetchAndCacheCategory(normalizedCategory, limit);
  },

  async fetchAndCacheCategory(category: string, limit: number = 50): Promise<CachedVideo[]> {
    const canFetch = await canFetchMore();
    if (!canFetch) {
      const cached = await getCachedVideos(category);
      if (cached) return cached.slice(0, limit);
      return [];
    }

    console.log(`Fetching category "${category}" via backend (limit: ${limit})`);
    const videos = await fetchCategoryFromBackend(category, limit);
    const unique = videos
      .map(v => ({ ...v, category }))
      .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)
      .slice(0, limit);

    if (unique.length > 0) {
      await setCachedVideos(category, unique);
      await markRefreshed(category);
      await recordFetch();
    }

    return unique;
  },

  async refreshCategoryInBackground(category: string, limit: number = 50): Promise<void> {
    try {
      console.log(`Background refresh for "${category}"`);
      await this.fetchAndCacheCategory(category, limit);
    } catch (error) {
      console.error(`Background refresh failed for "${category}":`, error);
    }
  },

  async getTrendingVideos(limit: number = 20): Promise<CachedVideo[]> {
    const cached = await getCachedVideos('_trending');

    if (cached && cached.length > 0) {
      const needsRefresh = await shouldRefresh('_trending');
      if (!needsRefresh) return cached.slice(0, limit);

      this.refreshTrendingInBackground(limit).catch(() => {});
      return cached.slice(0, limit);
    }

    return await this.fetchAndCacheTrending(limit);
  },

  async fetchAndCacheTrending(limit: number = 20): Promise<CachedVideo[]> {
    const canFetch = await canFetchMore();
    if (!canFetch) {
      const cached = await getCachedVideos('_trending');
      if (cached) return cached.slice(0, limit);
      return [];
    }

    console.log(`Fetching trending via backend (limit: ${limit})`);
    const videos = await fetchTrendingFromBackend(limit);
    const unique = videos
      .map(v => ({ ...v, category: 'Trending' }))
      .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)
      .slice(0, limit);

    if (unique.length > 0) {
      await setCachedVideos('_trending', unique);
      await markRefreshed('_trending');
      await recordFetch();
    }

    return unique;
  },

  async refreshTrendingInBackground(limit: number = 20): Promise<void> {
    try {
      console.log('Background refresh for trending');
      await this.fetchAndCacheTrending(limit);
    } catch (error) {
      console.error('Background trending refresh failed:', error);
    }
  },

  async searchVideos(query: string, limit: number = 20): Promise<CachedVideo[]> {
    const cacheKey = `_search_${query.toLowerCase().replace(/\s+/g, '_').slice(0, 50)}`;
    const cached = await getCachedVideos(cacheKey);

    if (cached && cached.length > 0) {
      const needsRefresh = await shouldRefresh(cacheKey);
      if (!needsRefresh) return cached.slice(0, limit);
    }

    const canFetch = await canFetchMore();
    if (!canFetch) {
      if (cached) return cached.slice(0, limit);
      return [];
    }

    console.log(`Searching "${query}" via backend (limit: ${limit})`);
    const videos = await fetchSearchFromBackend(query, limit);
    const results = videos.map(v => ({ ...v, category: 'Search Results' }));

    if (results.length > 0) {
      await setCachedVideos(cacheKey, results);
      await markRefreshed(cacheKey);
    }

    return results.slice(0, limit);
  },

  async getQuotaStatus(): Promise<{
    date: string;
    fetchCount: number;
    fetchMax: number;
    isLimitReached: boolean;
  }> {
    const counter = await getFetchCount();
    return {
      date: counter.date,
      fetchCount: counter.count,
      fetchMax: MAX_FETCHES_PER_DAY,
      isLimitReached: counter.count >= MAX_FETCHES_PER_DAY,
    };
  },

  async clearAllCaches(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ytKeys = keys.filter(k =>
        k.startsWith(STORAGE_KEYS.VIDEO_CACHE) ||
        k.startsWith(STORAGE_KEYS.LAST_REFRESH) ||
        k === STORAGE_KEYS.FETCH_COUNT
      );
      if (ytKeys.length > 0) {
        await AsyncStorage.multiRemove(ytKeys);
      }
      console.log('All YouTube caches cleared');
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  },
};

export default YouTubeContentManager;
