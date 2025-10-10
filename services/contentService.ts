import { Speech } from '@/types/speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  fetchContentByCategory as fetchYouTubeByCategory,
  searchYouTubeContent,
  fetchTrendingYouTubeContent
} from './youtubeDirectService';

const CACHE_DURATION = 1000 * 60 * 60 * 24;
const CACHE_PREFIX = 'content_cache_';

interface CachedContent {
  data: any;
  timestamp: number;
  category: string;
}

async function getCachedContent(category: string): Promise<any | null> {
  try {
    const cacheKey = `${CACHE_PREFIX}${category}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const parsed: CachedContent = JSON.parse(cached);
    const now = Date.now();
    
    if (now - parsed.timestamp > CACHE_DURATION) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }
    
    console.log(`✅ Using cached content for ${category}`);
    return parsed.data;
  } catch (error) {
    console.error('Error reading cache:', error);
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
    console.log(`✅ Cached content for ${category}`);
  } catch (error) {
    console.error('Error writing cache:', error);
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
      if (cached) {
        return cached.map((video: any) => convertVideoToSpeech(video, category));
      }
    }
    
    console.log(`📺 Fetching fresh content for ${category} directly from YouTube API`);
    
    const videos = await fetchYouTubeByCategory(category, limit);
    
    if (videos.length > 0) {
      await setCachedContent(category, videos);
    }
    
    return videos.map((video: any) => convertVideoToSpeech(video, category));
  } catch (error) {
    console.error(`❌ Error fetching content for ${category}:`, error);
    
    const cached = await getCachedContent(category);
    if (cached) {
      console.log('📦 Falling back to cached content');
      return cached.map((video: any) => convertVideoToSpeech(video, category));
    }
    
    return [];
  }
}

export async function searchFreshContent(
  query: string,
  limit: number = 20
): Promise<Speech[]> {
  try {
    console.log(`🔍 Searching YouTube directly for: "${query}"`);
    
    const videos = await searchYouTubeContent(query, limit);
    
    return videos.map((video: any) => 
      convertVideoToSpeech(video, 'Search Results')
    );
  } catch (error) {
    console.error(`❌ Error searching content:`, error);
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
      if (cached) {
        return cached.map((video: any) => convertVideoToSpeech(video, 'Trending'));
      }
    }
    
    console.log('📈 Fetching trending content directly from YouTube API');
    
    const videos = await fetchTrendingYouTubeContent(limit);
    
    if (videos.length > 0) {
      await setCachedContent('trending', videos);
    }
    
    return videos.map((video: any) => 
      convertVideoToSpeech(video, 'Trending')
    );
  } catch (error) {
    console.error('❌ Error fetching trending content:', error);
    
    const cached = await getCachedContent('trending');
    if (cached) {
      console.log('📦 Falling back to cached trending content');
      return cached.map((video: any) => convertVideoToSpeech(video, 'Trending'));
    }
    
    return [];
  }
}

export async function clearContentCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
    console.log('✅ Content cache cleared');
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
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
    console.error('❌ Error getting cache info:', error);
    return {
      categories: [],
      totalSize: 0,
      oldestCache: null,
    };
  }
}
