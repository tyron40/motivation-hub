import { YouTubeContentManager, CachedVideo } from './YouTubeContentManager';

const MOTIVATION_CHANNEL_ID = 'UCHmQDfB84rZecCY_ERM4eYQ';

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

function cachedToYouTubeVideo(video: CachedVideo): YouTubeVideo {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    thumbnail: video.thumbnail,
    channelTitle: video.channelTitle,
    channelId: video.channelId,
    publishedAt: video.publishedAt,
    duration: video.duration,
    viewCount: video.viewCount,
    category: video.category,
  };
}

export async function fetchYouTubeVideosDirect(
  query: string,
  maxResults: number = 50
): Promise<YouTubeVideo[]> {
  try {
    console.log(`Fetching YouTube videos via ContentManager for: "${query}"`);
    const videos = await YouTubeContentManager.searchVideos(query, maxResults);
    return videos.map(cachedToYouTubeVideo);
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return [];
  }
}

export async function fetchChannelVideos(
  channelId: string = MOTIVATION_CHANNEL_ID,
  limit: number = 50
): Promise<YouTubeVideo[]> {
  try {
    console.log(`Fetching channel videos via ContentManager`);
    const videos = await YouTubeContentManager.getTrendingVideos(limit);
    return videos.map(cachedToYouTubeVideo);
  } catch (error) {
    console.error('Error fetching channel videos:', error);
    return [];
  }
}

export async function fetchContentByCategory(
  category: string,
  limit: number = 50
): Promise<YouTubeVideo[]> {
  try {
    console.log(`Fetching category "${category}" via ContentManager`);
    const videos = await YouTubeContentManager.getVideosForCategory(category, limit);
    return videos.map(v => cachedToYouTubeVideo({ ...v, category }));
  } catch (error) {
    console.error(`Error fetching content for ${category}:`, error);
    return [];
  }
}

export async function searchYouTubeContent(
  query: string,
  limit: number = 100
): Promise<YouTubeVideo[]> {
  try {
    console.log(`Searching YouTube via ContentManager for: "${query}"`);
    const videos = await YouTubeContentManager.searchVideos(query, limit);
    return videos.map(cachedToYouTubeVideo);
  } catch (error) {
    console.error(`Error searching YouTube content:`, error);
    return [];
  }
}

export async function fetchTrendingYouTubeContent(
  limit: number = 100
): Promise<YouTubeVideo[]> {
  try {
    console.log('Fetching trending content via ContentManager');
    const videos = await YouTubeContentManager.getTrendingVideos(limit);
    return videos.map(cachedToYouTubeVideo);
  } catch (error) {
    console.error('Error fetching trending content:', error);
    return [];
  }
}
