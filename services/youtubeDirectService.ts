const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

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
  maxResults: number = 10
): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('⚠️ YouTube API key not configured. Add EXPO_PUBLIC_YOUTUBE_API_KEY to your .env file');
    return [];
  }

  try {
    console.log(`🔍 Fetching YouTube videos for: "${query}"`);
    
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', maxResults.toString());
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('videoDuration', 'medium');
    searchUrl.searchParams.set('key', YOUTUBE_API_KEY);

    console.log('📡 Calling YouTube Search API...');
    const searchResponse = await fetch(searchUrl.toString());
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('❌ YouTube Search API error:', searchResponse.status, errorText);
      throw new Error(`YouTube API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      console.log('⚠️ No videos found for query:', query);
      return [];
    }

    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    console.log(`✅ Found ${searchData.items.length} videos, fetching details...`);

    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
    detailsUrl.searchParams.set('id', videoIds);
    detailsUrl.searchParams.set('key', YOUTUBE_API_KEY);

    console.log('📡 Calling YouTube Videos API...');
    const detailsResponse = await fetch(detailsUrl.toString());
    
    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      console.error('❌ YouTube Videos API error:', detailsResponse.status, errorText);
      throw new Error(`YouTube API error: ${detailsResponse.status}`);
    }

    const detailsData = await detailsResponse.json();

    const videos = detailsData.items.map((item: any) => ({
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

    console.log(`✅ Successfully fetched ${videos.length} YouTube videos`);
    return videos;
  } catch (error) {
    console.error('❌ Error fetching YouTube videos:', error);
    return [];
  }
}

export async function fetchContentByCategory(
  category: string,
  limit: number = 10
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
  limit: number = 20
): Promise<YouTubeVideo[]> {
  console.log(`🔍 Searching YouTube for: "${query}"`);
  return await fetchYouTubeVideosDirect(query, limit);
}

export async function fetchTrendingYouTubeContent(
  limit: number = 20
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
