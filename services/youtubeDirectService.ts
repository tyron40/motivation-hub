const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || 'AIzaSyDCCZSM3VQT8BcYEqX5Qs0X5Yn_YF6Kd0w';
const MOTIVATION_CHANNEL_ID = 'UCHmQDfB84rZecCY_ERM4eYQ';

const REQUEST_CACHE = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 30;

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
};

function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

export async function fetchYouTubeVideosDirect(
  query: string,
  maxResults: number = 50
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('⚠️ YouTube API key not configured. Add EXPO_PUBLIC_YOUTUBE_API_KEY to your .env file');
    return [];
  }

  const cacheKey = `${query}-${maxResults}`;
  const cached = REQUEST_CACHE.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`✅ Using cached YouTube data for: "${query}"`);
    return cached.data;
  }

  try {
    console.log(`🔍 Fetching embeddable YouTube videos for: "${query}" (max: ${maxResults})`);
    
    const allVideos: YouTubeVideo[] = [];
    let pageToken: string | undefined = undefined;
    const batchSize = 50;
    const maxAttempts = 5;
    let attempts = 0;
    
    while (allVideos.length < maxResults && attempts < maxAttempts) {
      attempts++;
      const currentBatchSize = Math.min(batchSize, maxResults * 2);
      
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('maxResults', currentBatchSize.toString());
      searchUrl.searchParams.set('order', 'relevance');
      searchUrl.searchParams.set('videoDuration', 'any');
      searchUrl.searchParams.set('videoEmbeddable', 'true');
      searchUrl.searchParams.set('videoSyndicated', 'true');
      searchUrl.searchParams.set('key', YOUTUBE_API_KEY);
      
      if (pageToken) {
        searchUrl.searchParams.set('pageToken', pageToken);
      }

      console.log(`📡 Calling YouTube Search API (attempt ${attempts}/${maxAttempts})...`);
      const searchResponse = await fetch(searchUrl.toString(), {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('❌ YouTube Search API error:', searchResponse.status, errorText);
        break;
      }

      const searchData = await searchResponse.json();
      
      if (!searchData.items || searchData.items.length === 0) {
        console.log(`⚠️ No more videos found (attempt ${attempts})`);
        break;
      }

      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
      console.log(`✅ Found ${searchData.items.length} potential videos, fetching details...`);

      const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics,status');
      detailsUrl.searchParams.set('id', videoIds);
      detailsUrl.searchParams.set('key', YOUTUBE_API_KEY);

      const detailsResponse = await fetch(detailsUrl.toString(), {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!detailsResponse.ok) {
        const errorText = await detailsResponse.text();
        console.error('❌ YouTube Videos API error:', detailsResponse.status, errorText);
        break;
      }

      const detailsData = await detailsResponse.json();

      const batchVideos = detailsData.items
        .filter((item: any) => {
          const isEmbeddable = item.status?.embeddable === true;
          const isPublic = item.status?.privacyStatus === 'public';
          const hasValidDuration = parseDuration(item.contentDetails.duration) > 0;
          
          if (!isEmbeddable) {
            console.log(`⏭️ Skipping non-embeddable: ${item.snippet.title}`);
          }
          if (!isPublic) {
            console.log(`⏭️ Skipping non-public: ${item.snippet.title}`);
          }
          
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
          embeddable: true,
        }));
      
      allVideos.push(...batchVideos);
      console.log(`✅ Total embeddable videos: ${allVideos.length}/${maxResults} (filtered ${detailsData.items.length - batchVideos.length} non-embeddable)`);
      
      if (allVideos.length >= maxResults) {
        break;
      }
      
      pageToken = searchData.nextPageToken;
      if (!pageToken) {
        console.log('✅ No more pages available');
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const finalVideos = allVideos.slice(0, maxResults);
    
    REQUEST_CACHE.set(cacheKey, { data: finalVideos, timestamp: Date.now() });
    
    if (REQUEST_CACHE.size > 50) {
      const oldestKey = Array.from(REQUEST_CACHE.keys())[0];
      REQUEST_CACHE.delete(oldestKey);
    }

    console.log(`✅ Successfully fetched ${finalVideos.length} embeddable YouTube videos`);
    
    if (finalVideos.length === 0) {
      console.warn(`⚠️ No embeddable videos found for query: "${query}"`);
    }
    return finalVideos;
  } catch (error) {
    console.error('❌ Error fetching YouTube videos:', error);
    return [];
  }
}

export async function fetchChannelVideos(
  channelId: string = MOTIVATION_CHANNEL_ID,
  limit: number = 50
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('⚠️ YouTube API key not configured');
    return [];
  }

  const cacheKey = `channel-${channelId}-${limit}`;
  const cached = REQUEST_CACHE.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`✅ Using cached channel data for: ${channelId}`);
    return cached.data;
  }

  try {
    console.log(`📺 Fetching videos from channel: ${channelId}`);
    
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('channelId', channelId);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', Math.min(limit, 50).toString());
    searchUrl.searchParams.set('order', 'date');
    searchUrl.searchParams.set('key', YOUTUBE_API_KEY);

    console.log(`📡 Calling YouTube Search API for channel...`);
    const searchResponse = await fetch(searchUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('❌ YouTube Search API error:', searchResponse.status, errorText);
      return [];
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      console.log(`⚠️ No videos found in channel`);
      return [];
    }

    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    console.log(`✅ Found ${searchData.items.length} videos, fetching details...`);

    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics,status');
    detailsUrl.searchParams.set('id', videoIds);
    detailsUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const detailsResponse = await fetch(detailsUrl.toString(), {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      console.error('❌ YouTube Videos API error:', detailsResponse.status, errorText);
      return [];
    }

    const detailsData = await detailsResponse.json();

    const videos = detailsData.items
      .filter((item: any) => {
        const isPublic = item.status?.privacyStatus === 'public';
        const hasValidDuration = parseDuration(item.contentDetails.duration) > 0;
        return isPublic && hasValidDuration;
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
        category: 'Motivation',
      }));
    
    REQUEST_CACHE.set(cacheKey, { data: videos, timestamp: Date.now() });
    
    console.log(`✅ Successfully fetched ${videos.length} videos from channel`);
    return videos;
  } catch (error) {
    console.error('❌ Error fetching channel videos:', error);
    return [];
  }
}

export async function fetchContentByCategory(
  category: string,
  limit: number = 50
): Promise<YouTubeVideo[]> {
  const normalizedCategory = category.toLowerCase().trim();
  const query = CATEGORY_SEARCH_QUERIES[normalizedCategory];
  
  if (query) {
    console.log(`📺 Fetching YouTube videos for category "${category}" with query: "${query}"`);
    const videos = await fetchYouTubeVideosDirect(query, limit);
    return videos.map(v => ({ ...v, category }));
  }
  
  console.log(`📺 No specific query for "${category}", using generic search`);
  const videos = await fetchYouTubeVideosDirect(`${category} motivational speech`, limit);
  return videos.map(v => ({ ...v, category }));
}

export async function searchYouTubeContent(
  query: string,
  limit: number = 100
): Promise<YouTubeVideo[]> {
  console.log(`🔍 Searching YouTube for: "${query}"`);
  return await fetchYouTubeVideosDirect(query, limit);
}

export async function fetchTrendingYouTubeContent(
  limit: number = 100
): Promise<YouTubeVideo[]> {
  console.log('📈 Fetching content from Motivation Fueled channel');
  return await fetchChannelVideos(MOTIVATION_CHANNEL_ID, limit);
}
