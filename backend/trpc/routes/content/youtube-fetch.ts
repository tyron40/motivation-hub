import { z } from 'zod';
import { publicProcedure } from '../../create-context';

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

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

const CATEGORY_SEARCH_QUERIES: Record<string, string[]> = {
  motivation: [
    'motivational speech 2024',
    'david goggins motivation',
    'best motivational speech',
    'powerful motivation',
    'morning motivation speech',
  ],
  success: [
    'success mindset speech',
    'entrepreneur motivation',
    'business success speech',
    'wealth mindset',
    'success principles',
  ],
  mindset: [
    'growth mindset speech',
    'mental toughness',
    'champion mindset',
    'positive thinking speech',
    'mindset transformation',
  ],
  inspiration: [
    'inspirational speech',
    'life changing speech',
    'inspiring stories',
    'overcome adversity',
    'never give up speech',
  ],
  study: [
    'study motivation',
    'focus and concentration',
    'academic success',
    'learning motivation',
    'student motivation',
  ],
  'high energy': [
    'high energy motivation',
    'pump up speech',
    'workout motivation',
    'intense motivation',
    'energy boost speech',
  ],
  'daily motivation': [
    'daily motivation speech',
    'morning routine motivation',
    'daily inspiration',
    'start your day right',
    'daily mindset',
  ],
  'powerful speeches': [
    'powerful motivational speech',
    'life changing speech',
    'greatest speeches',
    'legendary speeches',
    'iconic motivational speech',
  ],
};

function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

async function fetchYouTubeVideos(
  query: string,
  maxResults: number = 10
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('⚠️ YouTube API key not configured');
    return [];
  }

  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', maxResults.toString());
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('videoDuration', 'any');
    searchUrl.searchParams.set('videoEmbeddable', 'true');
    searchUrl.searchParams.set('videoSyndicated', 'true');
    searchUrl.searchParams.set('videoLicense', 'any');
    searchUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) {
      throw new Error(`YouTube API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    if (!videoIds) {
      return [];
    }

    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
    detailsUrl.searchParams.set('id', videoIds);
    detailsUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const detailsResponse = await fetch(detailsUrl.toString());
    if (!detailsResponse.ok) {
      throw new Error(`YouTube API error: ${detailsResponse.status}`);
    }

    const detailsData = await detailsResponse.json();

    return detailsData.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt,
      duration: parseDuration(item.contentDetails.duration),
      viewCount: parseInt(item.statistics.viewCount || '0'),
      category: query,
    }));
  } catch (error) {
    console.error('❌ Error fetching YouTube videos:', error);
    return [];
  }
}

export const fetchContentProcedure = publicProcedure
  .input(
    z.object({
      category: z.string(),
      limit: z.number().min(1).max(50).default(10),
      refresh: z.boolean().default(false),
    })
  )
  .query(async ({ input }) => {
    const { category, limit, refresh } = input;
    
    console.log(`📺 Fetching content for category: ${category}`);
    
    const categoryKey = category.toLowerCase();
    const searchQueries = CATEGORY_SEARCH_QUERIES[categoryKey] || CATEGORY_SEARCH_QUERIES.motivation;
    
    const today = new Date().toISOString().split('T')[0];
    const queryIndex = new Date().getDate() % searchQueries.length;
    const todayQuery = searchQueries[queryIndex];
    
    console.log(`🔍 Using search query: "${todayQuery}" (rotates daily)`);
    
    const videos = await fetchYouTubeVideos(todayQuery, limit);
    
    return {
      videos,
      category,
      query: todayQuery,
      fetchedAt: new Date().toISOString(),
      nextRotation: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
    };
  });

export const searchContentProcedure = publicProcedure
  .input(
    z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).default(20),
    })
  )
  .query(async ({ input }) => {
    const { query, limit } = input;
    
    console.log(`🔍 Searching YouTube for: "${query}"`);
    
    const videos = await fetchYouTubeVideos(query, limit);
    
    return {
      videos,
      query,
      fetchedAt: new Date().toISOString(),
    };
  });

export const trendingContentProcedure = publicProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(50).default(20),
    })
  )
  .query(async ({ input }) => {
    const { limit } = input;
    
    console.log('📈 Fetching trending motivational content');
    
    const trendingQueries = [
      'motivational speech 2024',
      'best motivational speech',
      'powerful motivation',
    ];
    
    const queryIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % trendingQueries.length;
    const query = trendingQueries[queryIndex];
    
    const videos = await fetchYouTubeVideos(query, limit);
    
    return {
      videos,
      query,
      fetchedAt: new Date().toISOString(),
    };
  });
