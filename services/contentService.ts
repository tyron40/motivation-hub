import { Speech } from '@/types/speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  fetchContentByCategory as fetchYouTubeByCategory, 
  searchYouTubeContent, 
  fetchTrendingYouTubeContent 
} from '@/services/youtubeDirectService';
import {
  shouldRefreshContent,
  getQuotaStatus,
} from '@/services/youtubeContentManager';

const CACHE_DURATION = 1000 * 60 * 60 * 3; // 3 hours
const CACHE_PREFIX = 'content_cache_';

interface CachedContent {
  data: any;
  timestamp: number;
  category: string;
}

async function getCachedContent(category: string): Promise<{ data: any; expired: boolean } | null> {
  try {
    const cacheKey = `${CACHE_PREFIX}${category}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const parsed: CachedContent = JSON.parse(cached);
    const now = Date.now();
    
    if (now - parsed.timestamp > CACHE_DURATION) {
      console.log(`[ContentService] Cache expired for ${category}, will try to refresh`);
      return { data: parsed.data, expired: true };
    }
    
    console.log(`[ContentService] ✅ Using cached content for ${category}`);
    return { data: parsed.data, expired: false };
  } catch (error) {
    console.error('[ContentService] Error reading cache:', error);
    return null;
  }
}

async function setCachedContent(category: string, data: any): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIX}${category}`;
    const cached: CachedContent = {
      data,
      timestamp: Date.now(),
      category,
    };
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
    console.log(`[ContentService] ✅ Cached content for ${category}`);
  } catch (error) {
    console.error('[ContentService] Error writing cache:', error);
  }
}

function convertVideoToSpeech(video: any, category: string): Speech {
  return {
    id: video.id,
    title: video.title,
    speaker: video.channelTitle,
    duration: video.duration,
    category: category,
    imageUrl: video.thumbnail,
    audioUrl: `https://www.youtube.com/watch?v=${video.id}`,
    youtubeId: video.id,
    description: video.description,
    playCount: Math.floor(video.viewCount / 1000),
    tags: generateTags(video.title, video.description),
  };
}

function generateTags(title: string, description: string): string[] {
  const commonTags = ['motivation', 'inspiration', 'success', 'mindset', 'speech'];
  const titleWords = title.toLowerCase().split(' ');
  const descWords = description.toLowerCase().split(' ').slice(0, 20);
  
  const relevantWords = [...titleWords, ...descWords]
    .filter(word => word.length > 3)
    .filter(word => !['the', 'and', 'for', 'you', 'your', 'this', 'that', 'with', 'from'].includes(word))
    .slice(0, 5);
  
  return [...commonTags, ...relevantWords].slice(0, 8);
}

export async function fetchFreshContentByCategory(
  category: string,
  limit: number = 10,
  useCache: boolean = true
): Promise<Speech[]> {
  try {
    if (useCache) {
      const cached = await getCachedContent(category);
      if (cached && !cached.expired) {
        return cached.data.map((video: any) => convertVideoToSpeech(video, category));
      }

      const quotaStatus = await getQuotaStatus();
      if (!quotaStatus.canSearch && cached?.data) {
        console.log(`[ContentService] Quota limit reached – using cached content for ${category}`);
        return cached.data.map((video: any) => convertVideoToSpeech(video, category));
      }

      if (cached?.expired && cached?.data) {
        const needsRefresh = await shouldRefreshContent(`category-${category.toLowerCase().trim()}`);
        if (!needsRefresh) {
          return cached.data.map((video: any) => convertVideoToSpeech(video, category));
        }
      }
    }
    
    console.log(`[ContentService] 📺 Fetching fresh content for ${category}`);
    
    const videos = await fetchYouTubeByCategory(category, Math.min(limit, 20));
    
    if (videos.length > 0) {
      await setCachedContent(category, videos);
      return videos.map((video: any) => convertVideoToSpeech(video, category));
    }

    const cached = await getCachedContent(category);
    if (cached?.data) {
      console.log('[ContentService] 📦 Falling back to cached content');
      return cached.data.map((video: any) => convertVideoToSpeech(video, category));
    }
    
    return [];
  } catch (error) {
    console.error(`[ContentService] ❌ Error fetching content for ${category}:`, error);
    
    const cached = await getCachedContent(category);
    if (cached?.data) {
      console.log('[ContentService] 📦 Falling back to cached content after error');
      return cached.data.map((video: any) => convertVideoToSpeech(video, category));
    }
    
    return [];
  }
}

export async function searchFreshContent(
  query: string,
  limit: number = 20
): Promise<Speech[]> {
  try {
    const quotaStatus = await getQuotaStatus();
    if (!quotaStatus.canSearch) {
      console.log(`[ContentService] Quota limit reached – skipping search for "${query}"`);

      const cached = await getCachedContent(`search-${query}`);
      if (cached?.data) {
        return cached.data.map((video: any) => convertVideoToSpeech(video, 'Search Results'));
      }
      return [];
    }

    console.log(`[ContentService] 🔍 Searching YouTube for: "${query}"`);
    
    const videos = await searchYouTubeContent(query, Math.min(limit, 20));
    
    if (videos.length > 0) {
      await setCachedContent(`search-${query}`, videos);
    }

    return videos.map((video: any) => 
      convertVideoToSpeech(video, 'Search Results')
    );
  } catch (error) {
    console.error(`[ContentService] ❌ Error searching content:`, error);
    return [];
  }
}

export async function fetchTrendingContent(
  limit: number = 20,
  useCache: boolean = true
): Promise<Speech[]> {
  try {
    if (useCache) {
      const cached = await getCachedContent('trending');
      if (cached && !cached.expired) {
        return cached.data.map((video: any) => convertVideoToSpeech(video, 'Trending'));
      }

      const quotaStatus = await getQuotaStatus();
      if (!quotaStatus.canSearch && cached?.data) {
        console.log('[ContentService] Quota limit reached – using cached content for trending');
        return cached.data.map((video: any) => convertVideoToSpeech(video, 'Trending'));
      }
    }
    
    console.log('[ContentService] 📈 Fetching trending content');
    
    const videos = await fetchTrendingYouTubeContent(Math.min(limit, 20));
    
    if (videos.length > 0) {
      await setCachedContent('trending', videos);
    }
    
    return videos.map((video: any) => 
      convertVideoToSpeech(video, 'Trending')
    );
  } catch (error) {
    console.error('[ContentService] ❌ Error fetching trending content:', error);
    
    const cached = await getCachedContent('trending');
    if (cached?.data) {
      console.log('[ContentService] 📦 Falling back to cached trending content');
      return cached.data.map((video: any) => convertVideoToSpeech(video, 'Trending'));
    }
    
    return [];
  }
}

export async function clearContentCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
    console.log('[ContentService] ✅ Content cache cleared');
  } catch (error) {
    console.error('[ContentService] ❌ Error clearing cache:', error);
  }
}

export async function getCacheInfo(): Promise<{
  categories: string[];
  totalSize: number;
  oldestCache: Date | null;
}> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    
    const categories: string[] = [];
    let oldestTimestamp = Date.now();
    
    for (const key of cacheKeys) {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const parsed: CachedContent = JSON.parse(cached);
        categories.push(parsed.category);
        if (parsed.timestamp < oldestTimestamp) {
          oldestTimestamp = parsed.timestamp;
        }
      }
    }
    
    return {
      categories,
      totalSize: cacheKeys.length,
      oldestCache: cacheKeys.length > 0 ? new Date(oldestTimestamp) : null,
    };
  } catch (error) {
    console.error('[ContentService] ❌ Error getting cache info:', error);
    return {
      categories: [],
      totalSize: 0,
      oldestCache: null,
    };
  }
}
