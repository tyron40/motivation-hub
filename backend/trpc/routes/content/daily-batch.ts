import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { supabaseBackend } from '../../../lib/supabase';
import { YOUTUBE_API_KEYS, getNextYouTubeKey, markYouTubeKeyIssue, isQuotaError } from '../../../lib/youtube-keys';

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
  query: string;
}

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

async function fetchYouTubeVideosWithKey(
  query: string,
  maxResults: number,
  apiKey: string,
): Promise<YouTubeVideo[]> {
  console.log(`📡 Fetching YouTube videos for query: "${query}" with key ${apiKey.substring(0, 10)}...`);

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('maxResults', maxResults.toString());
  searchUrl.searchParams.set('order', 'relevance');
  searchUrl.searchParams.set('videoDuration', 'medium');
  searchUrl.searchParams.set('key', apiKey);

  const searchResponse = await fetch(searchUrl.toString());
  const searchErrorText = await searchResponse.text();

  if (!searchResponse.ok) {
    if (isQuotaError(searchResponse.status, searchErrorText)) {
      markYouTubeKeyIssue(apiKey, true);
    } else {
      markYouTubeKeyIssue(apiKey, false);
    }
    throw new Error(`YouTube API error: ${searchResponse.status}`);
  }

  const searchData = JSON.parse(searchErrorText);
  const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

  if (!videoIds) {
    return [];
  }

  const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
  detailsUrl.searchParams.set('id', videoIds);
  detailsUrl.searchParams.set('key', apiKey);

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
    category: '',
    query,
  }));
}

async function fetchYouTubeVideos(
  query: string,
  maxResults: number = 10,
  preferKeyIndex?: number,
): Promise<YouTubeVideo[]> {
  if (YOUTUBE_API_KEYS.length === 0) {
    console.warn('⚠️ YouTube API key not configured');
    return [];
  }

  let startIndex = preferKeyIndex ?? 0;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < YOUTUBE_API_KEYS.length; attempt++) {
    const key = getNextYouTubeKey(startIndex);
    if (!key) break;

    try {
      const videos = await fetchYouTubeVideosWithKey(query, maxResults, key);
      return videos;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`⚠️ YouTube attempt ${attempt + 1} failed with key ${key.substring(0, 10)}...: ${lastError.message}`);
      startIndex = (YOUTUBE_API_KEYS.indexOf(key) + 1) % YOUTUBE_API_KEYS.length;
    }
  }

  console.error('❌ Error fetching YouTube videos:', lastError);
  return [];
}

async function storeVideosInCache(videos: YouTubeVideo[], expiresAt: Date): Promise<number> {
  try {
    const videoRecords = videos.map(video => ({
      id: video.id,
      title: video.title,
      description: video.description,
      thumbnail: video.thumbnail,
      channel_title: video.channelTitle,
      channel_id: video.channelId,
      published_at: video.publishedAt,
      duration: video.duration,
      view_count: video.viewCount,
      category: video.category,
      query: video.query,
      expires_at: expiresAt.toISOString(),
    }));

    const { data, error } = await supabaseBackend
      .from('youtube_video_cache')
      .upsert(videoRecords, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('❌ Error storing videos in cache:', error);
      return 0;
    }

    console.log(`✅ Stored ${data?.length || 0} videos in cache`);
    return data?.length || 0;
  } catch (error) {
    console.error('❌ Error in storeVideosInCache:', error);
    return 0;
  }
}

async function cleanupExpiredVideos(): Promise<number> {
  try {
    const { data, error } = await supabaseBackend
      .rpc('cleanup_expired_youtube_videos');

    if (error) {
      console.error('❌ Error cleaning up expired videos:', error);
      return 0;
    }

    console.log(`🧹 Cleaned up ${data || 0} expired videos`);
    return data || 0;
  } catch (error) {
    console.error('❌ Error in cleanupExpiredVideos:', error);
    return 0;
  }
}

export const runDailyBatchProcedure = publicProcedure
  .input(
    z.object({
      videosPerQuery: z.number().min(1).max(10).default(5),
      forceRefresh: z.boolean().default(false),
    })
  )
  .mutation(async ({ input }) => {
    const { videosPerQuery, forceRefresh } = input;
    
    console.log('🚀 Starting daily YouTube batch fetch...');
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existingBatch } = await supabaseBackend
      .from('youtube_batch_logs')
      .select('*')
      .eq('batch_date', today)
      .eq('status', 'completed')
      .single();

    if (existingBatch && !forceRefresh) {
      console.log('✅ Batch already completed for today');
      return {
        success: true,
        message: 'Batch already completed for today',
        batchLog: existingBatch,
      };
    }

    const { data: batchLog, error: batchError } = await supabaseBackend
      .from('youtube_batch_logs')
      .upsert({
        batch_date: today,
        started_at: new Date().toISOString(),
        status: 'processing',
      }, { onConflict: 'batch_date' })
      .select()
      .single();

    if (batchError) {
      console.error('❌ Error creating batch log:', batchError);
      throw new Error('Failed to create batch log');
    }

    try {
      await cleanupExpiredVideos();

      const allVideos: YouTubeVideo[] = [];
      const categoriesProcessed: string[] = [];
      const queriesUsed: string[] = [];
      let apiCallsMade = 0;

      const expiresAt = new Date();
      expiresAt.setHours(24, 0, 0, 0);

      let keyIndex = 0;
      for (const [category, queries] of Object.entries(CATEGORY_SEARCH_QUERIES)) {
        const queryIndex = new Date().getDate() % queries.length;
        const todayQuery = queries[queryIndex];

        console.log(`📺 Fetching category: ${category}, query: "${todayQuery}"`);

        const videos = await fetchYouTubeVideos(todayQuery, videosPerQuery, keyIndex);
        apiCallsMade += 2;
        keyIndex = (keyIndex + 1) % Math.max(1, YOUTUBE_API_KEYS.length);

        const videosWithCategory = videos.map(v => ({
          ...v,
          category,
          query: todayQuery,
        }));

        allVideos.push(...videosWithCategory);
        categoriesProcessed.push(category);
        queriesUsed.push(todayQuery);

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const storedCount = await storeVideosInCache(allVideos, expiresAt);

      const { data: updatedBatchLog, error: updateError } = await supabaseBackend
        .from('youtube_batch_logs')
        .update({
          total_videos_fetched: storedCount,
          categories_processed: categoriesProcessed,
          queries_used: queriesUsed,
          api_calls_made: apiCallsMade,
          completed_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', batchLog.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating batch log:', updateError);
      }

      console.log('✅ Daily batch fetch completed successfully');
      console.log(`📊 Total videos: ${storedCount}`);
      console.log(`📊 API calls made: ${apiCallsMade}`);
      console.log(`📊 Categories: ${categoriesProcessed.length}`);

      return {
        success: true,
        message: 'Daily batch fetch completed',
        batchLog: updatedBatchLog || batchLog,
        stats: {
          totalVideos: storedCount,
          apiCalls: apiCallsMade,
          categoriesProcessed,
          queriesUsed,
        },
      };
    } catch (error: any) {
      console.error('❌ Batch fetch failed:', error);

      await supabaseBackend
        .from('youtube_batch_logs')
        .update({
          status: 'failed',
          error_message: error?.message || 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', batchLog.id);

      throw error;
    }
  });

export const getCachedVideosProcedure = publicProcedure
  .input(
    z.object({
      category: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    })
  )
  .query(async ({ input }) => {
    const { category, limit } = input;
    
    console.log(`📺 Fetching cached videos for category: ${category || 'all'}`);
    
    let query = supabaseBackend
      .from('youtube_video_cache')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('fetched_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category.toLowerCase());
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching cached videos:', error);
      return {
        videos: [],
        fromCache: true,
        cachedAt: null,
      };
    }

    const videos = data?.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      thumbnail: row.thumbnail,
      channelTitle: row.channel_title,
      channelId: row.channel_id,
      publishedAt: row.published_at,
      duration: row.duration,
      viewCount: row.view_count,
      category: row.category,
    })) || [];

    console.log(`✅ Retrieved ${videos.length} cached videos`);

    return {
      videos,
      fromCache: true,
      cachedAt: data?.[0]?.fetched_at || null,
    };
  });

export const getBatchStatusProcedure = publicProcedure.query(async () => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabaseBackend
    .from('youtube_batch_logs')
    .select('*')
    .eq('batch_date', today)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Error fetching batch status:', error);
    return {
      status: 'not_started',
      batchLog: null,
    };
  }

  return {
    status: data?.status || 'not_started',
    batchLog: data,
  };
});
