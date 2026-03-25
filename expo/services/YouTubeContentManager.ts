import AsyncStorage from '@react-native-async-storage/async-storage';

const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '';
const DAILY_QUOTA_LIMIT = 10000;
const MAX_SEARCH_REQUESTS_PER_DAY = 80;
const SEARCH_COST = 100;
const PLAYLIST_ITEMS_COST = 1;
const VIDEOS_DETAILS_COST = 1;
const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 3; // 3 hours
const MAX_FETCHES_PER_DAY = 10;

const STORAGE_KEYS = {
  QUOTA_TRACKER: 'yt_quota_tracker',
  VIDEO_CACHE: 'yt_video_cache_',
  LAST_REFRESH: 'yt_last_refresh_',
  FETCH_COUNT: 'yt_fetch_count',
} as const;

interface QuotaTracker {
  date: string;
  searchRequestCount: number;
  totalUnitsUsed: number;
  fetchCount: number;
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

const MOTIVATIONAL_PLAYLISTS: Record<string, string[]> = {
  motivation: [
    'PLiUrrIiqidTUau5F7ckXIY4G1Z0a96Cb3',
    'PL1sNd-gBgKcokKS0v14J_0yrxRItqD-uP',
  ],
  success: [
    'PLyrFnk53oxDKPGTwr19XOhfH-MONmgX6i',
  ],
  mindset: [
    'PLB5B2469B192F7A5F',
  ],
  fitness: [
    'PLNAUrPtYE_1bN_7L3sELiRGFNq8ivqcyH',
  ],
  study: [
    'PLHGiKZmQflXpV_x5C3b0y-8YPZET8sJ8v',
  ],
  'christian motivation': [
    'PLCbcIvLOHmBuP3WGEhSMQJVLsb_sMdcv8',
  ],
  'athlete pump up': [
    'PLiUrrIiqidTUau5F7ckXIY4G1Z0a96Cb3',
  ],
};

const MOTIVATION_CHANNEL_ID = 'UCHmQDfB84rZecCY_ERM4eYQ';

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

async function getQuotaTracker(): Promise<QuotaTracker> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.QUOTA_TRACKER);
    if (stored) {
      const tracker: QuotaTracker = JSON.parse(stored);
      if (tracker.date === getTodayDateString()) {
        return tracker;
      }
    }
  } catch (error) {
    console.error('Error reading quota tracker:', error);
  }

  const fresh: QuotaTracker = {
    date: getTodayDateString(),
    searchRequestCount: 0,
    totalUnitsUsed: 0,
    fetchCount: 0,
  };
  await saveQuotaTracker(fresh);
  console.log('YouTube quota tracker reset for new day');
  return fresh;
}

async function saveQuotaTracker(tracker: QuotaTracker): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.QUOTA_TRACKER, JSON.stringify(tracker));
  } catch (error) {
    console.error('Error saving quota tracker:', error);
  }
}

async function recordApiUsage(units: number, isSearch: boolean): Promise<void> {
  const tracker = await getQuotaTracker();
  tracker.totalUnitsUsed += units;
  if (isSearch) {
    tracker.searchRequestCount += 1;
  }
  await saveQuotaTracker(tracker);
  console.log(`YouTube request executed – units: ${units}, total today: ${tracker.totalUnitsUsed}/${DAILY_QUOTA_LIMIT}, searches: ${tracker.searchRequestCount}/${MAX_SEARCH_REQUESTS_PER_DAY}`);
}

async function recordFetch(): Promise<void> {
  const tracker = await getQuotaTracker();
  tracker.fetchCount += 1;
  await saveQuotaTracker(tracker);
  console.log(`YouTube fetch count: ${tracker.fetchCount}/${MAX_FETCHES_PER_DAY}`);
}

async function canMakeSearchRequest(): Promise<boolean> {
  const tracker = await getQuotaTracker();
  if (tracker.searchRequestCount >= MAX_SEARCH_REQUESTS_PER_DAY) {
    console.log('Quota limit reached – using cached content (search limit)');
    return false;
  }
  if (tracker.totalUnitsUsed + SEARCH_COST > DAILY_QUOTA_LIMIT) {
    console.log('Quota limit reached – using cached content (unit limit)');
    return false;
  }
  return true;
}

async function canMakePlaylistRequest(): Promise<boolean> {
  const tracker = await getQuotaTracker();
  if (tracker.totalUnitsUsed + PLAYLIST_ITEMS_COST > DAILY_QUOTA_LIMIT) {
    console.log('Quota limit reached – using cached content (unit limit for playlist)');
    return false;
  }
  return true;
}

async function canFetchMore(): Promise<boolean> {
  const tracker = await getQuotaTracker();
  if (tracker.fetchCount >= MAX_FETCHES_PER_DAY) {
    console.log('Quota limit reached – using cached content (daily fetch limit)');
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

async function fetchVideoDetails(videoIds: string[]): Promise<CachedVideo[]> {
  if (videoIds.length === 0) return [];

  const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics,status');
  detailsUrl.searchParams.set('id', videoIds.join(','));
  detailsUrl.searchParams.set('key', YOUTUBE_API_KEY);

  const response = await fetch(detailsUrl.toString(), {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('YouTube Videos API error:', response.status, errorText);
    return [];
  }

  await recordApiUsage(VIDEOS_DETAILS_COST, false);
  const data = await response.json();

  return (data.items || [])
    .filter((item: any) => {
      const isEmbeddable = item.status?.embeddable === true;
      const isPublic = item.status?.privacyStatus === 'public';
      const hasValidDuration = parseDuration(item.contentDetails.duration) > 0;
      return isEmbeddable && isPublic && hasValidDuration;
    })
    .map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description || '',
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || '',
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt,
      duration: parseDuration(item.contentDetails.duration),
      viewCount: parseInt(item.statistics?.viewCount || '0'),
      category: '',
    }));
}

async function fetchFromPlaylist(playlistId: string, maxResults: number = 50): Promise<CachedVideo[]> {
  if (!YOUTUBE_API_KEY) return [];
  if (!(await canMakePlaylistRequest())) return [];

  try {
    console.log(`Fetching playlist ${playlistId} (cost: ${PLAYLIST_ITEMS_COST} unit)`);

    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('playlistId', playlistId);
    url.searchParams.set('maxResults', Math.min(maxResults, 50).toString());
    url.searchParams.set('key', YOUTUBE_API_KEY);

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Playlist API error:', response.status, errorText);
      return [];
    }

    await recordApiUsage(PLAYLIST_ITEMS_COST, false);
    const data = await response.json();

    if (!data.items || data.items.length === 0) return [];

    const videoIds = data.items
      .map((item: any) => item.contentDetails?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) return [];

    return await fetchVideoDetails(videoIds);
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return [];
  }
}

async function fetchFromSearch(query: string, maxResults: number = 20): Promise<CachedVideo[]> {
  if (!YOUTUBE_API_KEY) return [];
  if (!(await canMakeSearchRequest())) return [];

  try {
    console.log(`Search API call for "${query}" (cost: ${SEARCH_COST} units)`);

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', Math.min(maxResults, 50).toString());
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('videoEmbeddable', 'true');
    searchUrl.searchParams.set('videoSyndicated', 'true');
    searchUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const response = await fetch(searchUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Search API error:', response.status, errorText);
      return [];
    }

    await recordApiUsage(SEARCH_COST, true);
    const data = await response.json();

    if (!data.items || data.items.length === 0) return [];

    const videoIds = data.items.map((item: any) => item.id?.videoId).filter(Boolean);
    if (videoIds.length === 0) return [];

    return await fetchVideoDetails(videoIds);
  } catch (error) {
    console.error('Error in search fetch:', error);
    return [];
  }
}

async function fetchFromChannelUploads(channelId: string, maxResults: number = 50): Promise<CachedVideo[]> {
  if (!YOUTUBE_API_KEY) return [];
  if (!(await canMakePlaylistRequest())) return [];

  try {
    const channelUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
    channelUrl.searchParams.set('part', 'contentDetails');
    channelUrl.searchParams.set('id', channelId);
    channelUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const channelResponse = await fetch(channelUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!channelResponse.ok) return [];

    await recordApiUsage(1, false);
    const channelData = await channelResponse.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) return [];

    return await fetchFromPlaylist(uploadsPlaylistId, maxResults);
  } catch (error) {
    console.error('Error fetching channel uploads:', error);
    return [];
  }
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
      console.log('Quota limit reached – using cached content');
      return [];
    }

    let videos: CachedVideo[] = [];

    const playlists = MOTIVATIONAL_PLAYLISTS[category];
    if (playlists && playlists.length > 0) {
      console.log(`Using playlist-based fetch for "${category}" (low cost)`);
      for (const playlistId of playlists) {
        const playlistVideos = await fetchFromPlaylist(playlistId, Math.min(limit, 50));
        videos.push(...playlistVideos.map(v => ({ ...v, category })));
        if (videos.length >= limit) break;
      }
    }

    if (videos.length < 10) {
      console.log(`Playlist fetch insufficient for "${category}", using search fallback`);
      const canSearch = await canMakeSearchRequest();
      if (canSearch) {
        const CATEGORY_QUERIES: Record<string, string> = {
          motivation: 'best motivational speech compilation 2024',
          success: 'success mindset entrepreneur motivation speech',
          mindset: 'growth mindset mental toughness speech',
          fitness: 'fitness workout motivation gym speech',
          study: 'study motivation focus concentration speech',
          'christian motivation': 'christian motivational speech church encouragement sermon',
          'athlete pump up': 'athlete pump up motivation workout speech',
        };
        const query = CATEGORY_QUERIES[category] || `${category} motivational speech`;
        const searchVideos = await fetchFromSearch(query, limit);
        videos.push(...searchVideos.map(v => ({ ...v, category })));
      }
    }

    const unique = videos.filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i).slice(0, limit);

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

    let videos = await fetchFromChannelUploads(MOTIVATION_CHANNEL_ID, limit);

    if (videos.length < 5) {
      const canSearch = await canMakeSearchRequest();
      if (canSearch) {
        const searchVideos = await fetchFromSearch('motivational speech trending 2024', limit);
        videos.push(...searchVideos);
      }
    }

    const unique = videos
      .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)
      .map(v => ({ ...v, category: 'Trending' }))
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

    const canSearch = await canMakeSearchRequest();
    if (!canSearch) {
      if (cached) return cached.slice(0, limit);
      console.log('Quota limit reached – using cached content');
      return [];
    }

    const videos = await fetchFromSearch(query, limit);
    const results = videos.map(v => ({ ...v, category: 'Search Results' }));

    if (results.length > 0) {
      await setCachedVideos(cacheKey, results);
      await markRefreshed(cacheKey);
    }

    return results.slice(0, limit);
  },

  async getQuotaStatus(): Promise<{
    date: string;
    searchRequestsUsed: number;
    searchRequestsMax: number;
    unitsUsed: number;
    unitsMax: number;
    fetchCount: number;
    fetchMax: number;
    isQuotaReached: boolean;
  }> {
    const tracker = await getQuotaTracker();
    return {
      date: tracker.date,
      searchRequestsUsed: tracker.searchRequestCount,
      searchRequestsMax: MAX_SEARCH_REQUESTS_PER_DAY,
      unitsUsed: tracker.totalUnitsUsed,
      unitsMax: DAILY_QUOTA_LIMIT,
      fetchCount: tracker.fetchCount,
      fetchMax: MAX_FETCHES_PER_DAY,
      isQuotaReached: tracker.searchRequestCount >= MAX_SEARCH_REQUESTS_PER_DAY || tracker.totalUnitsUsed >= DAILY_QUOTA_LIMIT,
    };
  },

  async clearAllCaches(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ytKeys = keys.filter(k =>
        k.startsWith(STORAGE_KEYS.VIDEO_CACHE) ||
        k.startsWith(STORAGE_KEYS.LAST_REFRESH) ||
        k === STORAGE_KEYS.QUOTA_TRACKER ||
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
