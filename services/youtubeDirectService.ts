import {
  canMakeSearchRequest,
  shouldRefreshContent,
  getCachedVideos,
  setCachedVideos,
  incrementQuota,
  getQuotaStatus,
  CachedVideo,
} from './youtubeContentManager';

const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '';
const MOTIVATION_CHANNEL_ID = 'UCHmQDfB84rZecCY_ERM4eYQ';

const MEMORY_CACHE = new Map<string, { data: CachedVideo[]; timestamp: number }>();
const MEMORY_CACHE_TTL = 1000 * 60 * 60 * 3; // 3 hours

interface YouTubeVideo {
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

const CATEGORY_SEARCH_QUERIES: Record<string, string> = {
  motivation: 'best motivational speech compilation 2024',
  success: 'success mindset entrepreneur motivation speech',
  mindset: 'growth mindset mental toughness speech',
  fitness: 'fitness workout motivation gym speech',
  study: 'study motivation focus concentration speech',
  'christian motivation': 'christian motivational speech church encouragement sermon',
  'high energy': 'high energy motivation pump up speech',
  'daily motivation': 'daily motivation speech morning routine',
  'powerful speeches': 'powerful motivational speech legendary',
  'athlete pump up': 'athlete pump up motivation pregame speech',
  inspiration: 'inspirational speech life changing stories',
};

const KNOWN_PLAYLIST_IDS: Record<string, string> = {
  motivation: 'PLiUrrIiqidTUau5F7ckXIY4G1Z0a96Cb5',
};

function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

function getMemoryCached(key: string): CachedVideo[] | null {
  const entry = MEMORY_CACHE.get(key);
  if (entry && Date.now() - entry.timestamp < MEMORY_CACHE_TTL) {
    console.log(`[YouTube] ✅ Memory cache hit for: "${key}"`);
    return entry.data;
  }
  return null;
}

function setMemoryCache(key: string, data: CachedVideo[]): void {
  MEMORY_CACHE.set(key, { data, timestamp: Date.now() });
  if (MEMORY_CACHE.size > 30) {
    const oldestKey = Array.from(MEMORY_CACHE.keys())[0];
    MEMORY_CACHE.delete(oldestKey);
  }
}

async function fetchPlaylistItems(
  playlistId: string,
  maxResults: number = 20
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) return [];

  try {
    console.log(`[YouTube] 📋 Fetching playlist items (1 unit cost) for: ${playlistId}`);

    const playlistUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    playlistUrl.searchParams.set('part', 'snippet,contentDetails');
    playlistUrl.searchParams.set('playlistId', playlistId);
    playlistUrl.searchParams.set('maxResults', Math.min(maxResults, 50).toString());
    playlistUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const response = await fetch(playlistUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error('[YouTube] Playlist API error:', response.status);
      return [];
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) return [];

    const videoIds = data.items
      .map((item: any) => item.contentDetails?.videoId)
      .filter(Boolean)
      .join(',');

    if (!videoIds) return [];

    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics,status');
    detailsUrl.searchParams.set('id', videoIds);
    detailsUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const detailsResponse = await fetch(detailsUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!detailsResponse.ok) return [];

    const detailsData = await detailsResponse.json();

    await incrementQuota(0, 2); // playlistItems (1) + videos (1) = 2 units

    return detailsData.items
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
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        publishedAt: item.snippet.publishedAt,
        duration: parseDuration(item.contentDetails.duration),
        viewCount: parseInt(item.statistics.viewCount || '0'),
        category: 'playlist',
      }));
  } catch (error) {
    console.error('[YouTube] Playlist fetch error:', error);
    return [];
  }
}

async function fetchViaSearch(
  query: string,
  maxResults: number = 10
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('[YouTube] ⚠️ API key not configured');
    return [];
  }

  const allowed = await canMakeSearchRequest();
  if (!allowed) {
    console.log('[QuotaManager] ⛔ Quota limit reached – using cached content');
    return [];
  }

  try {
    console.log(`[YouTube] 🔍 YouTube request executed: search for "${query}" (100 units)`);

    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', Math.min(maxResults, 25).toString());
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('videoDuration', 'any');
    searchUrl.searchParams.set('videoEmbeddable', 'true');
    searchUrl.searchParams.set('videoSyndicated', 'true');
    searchUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const searchResponse = await fetch(searchUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[YouTube] ❌ Search API error:', searchResponse.status, errorText);

      if (searchResponse.status === 403 && errorText.includes('quota')) {
        console.error('[YouTube] ⛔ Quota limit reached – using cached content');
      }
      return [];
    }

    const searchData = await searchResponse.json();
    if (!searchData.items || searchData.items.length === 0) return [];

    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    if (!videoIds) return [];

    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics,status');
    detailsUrl.searchParams.set('id', videoIds);
    detailsUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const detailsResponse = await fetch(detailsUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!detailsResponse.ok) return [];

    const detailsData = await detailsResponse.json();

    await incrementQuota(1, 1); // search (100 units) + videos (1 unit)

    const videos = detailsData.items
      .filter((item: any) => {
        const isEmbeddable = item.status?.embeddable === true;
        const isPublic = item.status?.privacyStatus === 'public';
        const hasValidDuration = parseDuration(item.contentDetails.duration) > 0;
        if (!isEmbeddable) console.log(`[YouTube] ⏭️ Skipping non-embeddable: ${item.snippet.title}`);
        return isEmbeddable && isPublic && hasValidDuration;
      })
      .map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description || '',
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        publishedAt: item.snippet.publishedAt,
        duration: parseDuration(item.contentDetails.duration),
        viewCount: parseInt(item.statistics.viewCount || '0'),
        category: query,
      }));

    console.log(`[YouTube] ✅ Successfully fetched ${videos.length} embeddable videos`);
    return videos;
  } catch (error) {
    console.error('[YouTube] ❌ Error fetching videos:', error);
    return [];
  }
}

export async function fetchYouTubeVideosDirect(
  query: string,
  maxResults: number = 20
): Promise<YouTubeVideo[]> {
  const cacheKey = `search-${query}-${maxResults}`;

  const memoryCached = getMemoryCached(cacheKey);
  if (memoryCached) return memoryCached;

  const persistedCache = await getCachedVideos(cacheKey);
  if (persistedCache && persistedCache.length > 0) {
    setMemoryCache(cacheKey, persistedCache);
    return persistedCache;
  }

  const needsRefresh = await shouldRefreshContent(cacheKey);
  if (!needsRefresh) {
    console.log(`[YouTube] Content for "${query}" does not need refresh yet`);
    return persistedCache || [];
  }

  const status = await getQuotaStatus();
  console.log(`[YouTube] Quota status: ${status.searchesUsed}/${status.searchesUsed + status.searchesRemaining} searches, ${status.unitsUsed} units used`);

  const videos = await fetchViaSearch(query, maxResults);

  if (videos.length > 0) {
    const cachedVideos: CachedVideo[] = videos.map(v => ({
      id: v.id,
      title: v.title,
      description: v.description,
      thumbnail: v.thumbnail,
      channelTitle: v.channelTitle,
      channelId: v.channelId,
      publishedAt: v.publishedAt,
      duration: v.duration,
      viewCount: v.viewCount,
      category: v.category,
    }));
    await setCachedVideos(cacheKey, cachedVideos, query);
    setMemoryCache(cacheKey, cachedVideos);
    console.log('[QuotaManager] Video cache updated');
    return cachedVideos;
  }

  if (persistedCache && persistedCache.length > 0) {
    console.log('[YouTube] ⚠️ API returned no results, using stale cache');
    return persistedCache;
  }

  return [];
}

export async function fetchChannelVideos(
  channelId: string = MOTIVATION_CHANNEL_ID,
  limit: number = 20
): Promise<YouTubeVideo[]> {
  const cacheKey = `channel-${channelId}`;

  const memoryCached = getMemoryCached(cacheKey);
  if (memoryCached) return memoryCached;

  const persistedCache = await getCachedVideos(cacheKey);
  if (persistedCache && persistedCache.length > 0) {
    setMemoryCache(cacheKey, persistedCache);
    return persistedCache;
  }

  const needsRefresh = await shouldRefreshContent(cacheKey);
  if (!needsRefresh) {
    return persistedCache || [];
  }

  const channelPlaylistId = `UU${channelId.substring(2)}`;
  let videos = await fetchPlaylistItems(channelPlaylistId, limit);

  if (videos.length === 0) {
    console.log('[YouTube] Playlist fetch returned 0, falling back to search');
    videos = await fetchViaSearch(`motivation fueled channel`, Math.min(limit, 15));
  }

  if (videos.length > 0) {
    const cachedVideos: CachedVideo[] = videos.map(v => ({
      id: v.id,
      title: v.title,
      description: v.description,
      thumbnail: v.thumbnail,
      channelTitle: v.channelTitle,
      channelId: v.channelId,
      publishedAt: v.publishedAt,
      duration: v.duration,
      viewCount: v.viewCount,
      category: v.category,
    }));
    await setCachedVideos(cacheKey, cachedVideos, `channel:${channelId}`);
    setMemoryCache(cacheKey, cachedVideos);
    console.log('[QuotaManager] Video cache updated');
    return cachedVideos;
  }

  return persistedCache || [];
}

export async function fetchContentByCategory(
  category: string,
  limit: number = 20
): Promise<YouTubeVideo[]> {
  const normalizedCategory = category.toLowerCase().trim();
  const cacheKey = `category-${normalizedCategory}`;

  const memoryCached = getMemoryCached(cacheKey);
  if (memoryCached) return memoryCached.map(v => ({ ...v, category }));

  const persistedCache = await getCachedVideos(cacheKey);
  if (persistedCache && persistedCache.length > 0) {
    setMemoryCache(cacheKey, persistedCache);
    return persistedCache.map(v => ({ ...v, category }));
  }

  const needsRefresh = await shouldRefreshContent(cacheKey);
  if (!needsRefresh && persistedCache) {
    return persistedCache.map(v => ({ ...v, category }));
  }

  const playlistId = KNOWN_PLAYLIST_IDS[normalizedCategory];
  let videos: YouTubeVideo[] = [];

  if (playlistId) {
    console.log(`[YouTube] 📋 Using playlist (low cost) for category "${category}"`);
    videos = await fetchPlaylistItems(playlistId, limit);
  }

  if (videos.length === 0) {
    const query = CATEGORY_SEARCH_QUERIES[normalizedCategory] || `${category} motivational speech`;
    console.log(`[YouTube] 🔍 Using search for category "${category}" with query: "${query}"`);
    videos = await fetchViaSearch(query, Math.min(limit, 15));
  }

  if (videos.length > 0) {
    const cachedVideos: CachedVideo[] = videos.map(v => ({
      id: v.id,
      title: v.title,
      description: v.description,
      thumbnail: v.thumbnail,
      channelTitle: v.channelTitle,
      channelId: v.channelId,
      publishedAt: v.publishedAt,
      duration: v.duration,
      viewCount: v.viewCount,
      category,
    }));
    await setCachedVideos(cacheKey, cachedVideos, normalizedCategory);
    setMemoryCache(cacheKey, cachedVideos);
    console.log('[QuotaManager] Video cache updated');
    return cachedVideos;
  }

  if (persistedCache && persistedCache.length > 0) {
    console.log(`[YouTube] ⚠️ Using stale cache for "${category}"`);
    return persistedCache.map(v => ({ ...v, category }));
  }

  return [];
}

export async function searchYouTubeContent(
  query: string,
  limit: number = 20
): Promise<YouTubeVideo[]> {
  console.log(`[YouTube] 🔍 Searching YouTube for: "${query}"`);
  return await fetchYouTubeVideosDirect(query, Math.min(limit, 20));
}

export async function fetchTrendingYouTubeContent(
  limit: number = 20
): Promise<YouTubeVideo[]> {
  console.log('[YouTube] 📈 Fetching content from Motivation Fueled channel');
  return await fetchChannelVideos(MOTIVATION_CHANNEL_ID, Math.min(limit, 20));
}
