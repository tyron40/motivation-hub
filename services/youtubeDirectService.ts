const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

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
    console.log(`🔍 Fetching YouTube videos for: "${query}" (max: ${maxResults})`);
    
    const allVideos: YouTubeVideo[] = [];
    let pageToken: string | undefined = undefined;
    const batchSize = 50;
    const batches = Math.ceil(maxResults / batchSize);
    
    for (let i = 0; i < batches && allVideos.length < maxResults; i++) {
      const currentBatchSize = Math.min(batchSize, maxResults - allVideos.length);
      
      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('q', query);
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('maxResults', currentBatchSize.toString());
      searchUrl.searchParams.set('order', 'relevance');
      searchUrl.searchParams.set('videoDuration', 'any');
      searchUrl.searchParams.set('videoEmbeddable', 'true');
      searchUrl.searchParams.set('videoSyndicated', 'true');
      searchUrl.searchParams.set('videoLicense', 'any');
      searchUrl.searchParams.set('key', YOUTUBE_API_KEY);
      
      if (pageToken) {
        searchUrl.searchParams.set('pageToken', pageToken);
      }

      console.log(`📡 Calling YouTube Search API (batch ${i + 1}/${batches})...`);
      const searchResponse = await fetch(searchUrl.toString(), {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('❌ YouTube Search API error:', searchResponse.status, errorText);
        
        if (allVideos.length > 0) {
          console.log(`⚠️ Returning ${allVideos.length} videos fetched so far`);
          break;
        }
        throw new Error(`YouTube API error: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      
      if (!searchData.items || searchData.items.length === 0) {
        console.log(`⚠️ No more videos found (batch ${i + 1})`);
        break;
      }

      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
      console.log(`✅ Found ${searchData.items.length} videos in batch ${i + 1}, fetching details...`);

      const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics,status');
      detailsUrl.searchParams.set('id', videoIds);
      detailsUrl.searchParams.set('key', YOUTUBE_API_KEY);

      console.log('📡 Calling YouTube Videos API...');
      const detailsResponse = await fetch(detailsUrl.toString(), {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!detailsResponse.ok) {
        const errorText = await detailsResponse.text();
        console.error('❌ YouTube Videos API error:', detailsResponse.status, errorText);
        
        if (allVideos.length > 0) {
          console.log(`⚠️ Returning ${allVideos.length} videos fetched so far`);
          break;
        }
        throw new Error(`YouTube API error: ${detailsResponse.status}`);
      }

      const detailsData = await detailsResponse.json();

      const batchVideos = detailsData.items
        .filter((item: any) => {
          const isEmbeddable = item.status?.embeddable !== false;
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
          description: item.snippet.description,
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
      console.log(`✅ Total embeddable videos fetched: ${allVideos.length}/${maxResults} (filtered ${detailsData.items.length - batchVideos.length} non-embeddable)`);
      
      pageToken = searchData.nextPageToken;
      if (!pageToken) {
        console.log('✅ No more pages available');
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    REQUEST_CACHE.set(cacheKey, { data: allVideos, timestamp: Date.now() });
    
    if (REQUEST_CACHE.size > 50) {
      const oldestKey = Array.from(REQUEST_CACHE.keys())[0];
      REQUEST_CACHE.delete(oldestKey);
    }

    console.log(`✅ Successfully fetched ${allVideos.length} embeddable YouTube videos`);
    
    if (allVideos.length === 0) {
      console.warn(`⚠️ No embeddable videos found for query: "${query}"`);
    }
    return allVideos;
  } catch (error) {
    console.error('❌ Error fetching YouTube videos:', error);
    return [];
  }
}

export async function fetchContentByCategory(
  category: string,
  limit: number = 100
): Promise<YouTubeVideo[]> {
  const categoryKey = category.toLowerCase();
  const searchQueries = CATEGORY_SEARCH_QUERIES[categoryKey] || CATEGORY_SEARCH_QUERIES.motivation;
  
  const queryIndex = new Date().getDate() % searchQueries.length;
  const todayQuery = searchQueries[queryIndex];
  
  console.log(`📺 Fetching content for category: ${category}`);
  console.log(`🔍 Using search query: "${todayQuery}" (rotates daily)`);
  
  return await fetchYouTubeVideosDirect(todayQuery, limit);
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
  console.log('📈 Fetching trending motivational content');
  
  const trendingQueries = [
    'motivational speech 2024',
    'best motivational speech',
    'powerful motivation',
  ];
  
  const queryIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % trendingQueries.length;
  const query = trendingQueries[queryIndex];
  
  console.log(`🔍 Using trending query: "${query}"`);
  return await fetchYouTubeVideosDirect(query, limit);
}
