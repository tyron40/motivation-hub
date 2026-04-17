// YouTube Video Fetch Service - Direct API Integration (No Embedding)
import { Speech } from '@/types/speech';
import { 
  fetchContentByCategory,
  searchYouTubeContent,
  fetchTrendingYouTubeContent
} from './youtubeDirectService';

// Video interface for our service
export interface YouTubeVideoData {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  duration: number;
  durationFormatted: string;
  viewCount: number;
  viewCountFormatted: string;
  youtubeUrl: string;
  embedUrl: string;
  category: string;
}

// Helper functions
const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatViewCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K views`;
  }
  return `${count} views`;
};

// Get videos by category using YouTube API
export const getVideosByCategory = async (category: string, limit: number = 50): Promise<YouTubeVideoData[]> => {
  try {
    console.log(`📺 Fetching videos for category: ${category} via YouTube API`);
    
    const videos = await fetchContentByCategory(category, limit);
    
    return videos.map(video => ({
      ...video,
      durationFormatted: formatDuration(video.duration),
      viewCountFormatted: formatViewCount(video.viewCount),
      youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
      embedUrl: `https://www.youtube.com/embed/${video.id}`,
    }));
  } catch (error: any) {
    console.error('❌ Error fetching videos by category:', error);
    return [];
  }
};

// Search videos using YouTube API  
export const searchVideos = async (query: string, limit: number = 50): Promise<YouTubeVideoData[]> => {
  try {
    console.log(`🔍 Searching YouTube for: "${query}"`);
    
    const videos = await searchYouTubeContent(query, limit);
    
    return videos.map(video => ({
      ...video,
      durationFormatted: formatDuration(video.duration),
      viewCountFormatted: formatViewCount(video.viewCount),
      youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
      embedUrl: `https://www.youtube.com/embed/${video.id}`,
    }));
  } catch (error: any) {
    console.error('❌ Error searching videos:', error);
    return [];
  }
};

// Get trending videos using YouTube API
export const getTrendingVideos = async (limit: number = 50): Promise<YouTubeVideoData[]> => {
  try {
    console.log('📈 Fetching trending YouTube content');
    
    const videos = await fetchTrendingYouTubeContent(limit);
    
    return videos.map(video => ({
      ...video,
      durationFormatted: formatDuration(video.duration),
      viewCountFormatted: formatViewCount(video.viewCount),
      youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
      embedUrl: `https://www.youtube.com/embed/${video.id}`,
    }));
  } catch (error: any) {
    console.error('❌ Error fetching trending videos:', error);
    return [];
  }
};

// Get available categories
export const getAvailableCategories = async (): Promise<string[]> => {
  return ['Motivation', 'Success', 'Mindset', 'Fitness', 'Study'];
};

// Convert YouTube video to Speech format
export const convertVideoToSpeech = (video: YouTubeVideoData): Speech => {
  return {
    id: video.id,
    title: video.title,
    speaker: video.channelTitle,
    duration: video.duration,
    category: video.category,
    imageUrl: video.thumbnail,
    audioUrl: video.youtubeUrl,
    youtubeId: video.id,
    description: video.description,
    playCount: Math.floor(video.viewCount / 1000),
    tags: generateTags(video.title, video.description)
  };
};

// Generate tags from title and description
const generateTags = (title: string, description: string): string[] => {
  const commonTags = ['motivation', 'inspiration', 'success', 'mindset', 'speech'];
  const titleWords = title.toLowerCase().split(' ');
  const descWords = description.toLowerCase().split(' ').slice(0, 20);
  
  const relevantWords = [...titleWords, ...descWords]
    .filter(word => word.length > 3)
    .filter(word => !['the', 'and', 'for', 'you', 'your', 'this', 'that', 'with', 'from'].includes(word))
    .slice(0, 5);
  
  return [...commonTags, ...relevantWords].slice(0, 8);
};

// Get video embed URL with no suggestions/autoplay (for reference only - not used for embedding)
export const getCleanEmbedUrl = (videoId: string): string => {
  const params = new URLSearchParams({
    autoplay: '0',
    controls: '1',
    rel: '0',
    showinfo: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    fs: '1',
    cc_load_policy: '0',
    disablekb: '0',
    playsinline: '1',
    end: '',
    loop: '0'
  });
  
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};

// Validate YouTube video ID
export const isValidVideoId = (videoId: string): boolean => {
  const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  return videoIdRegex.test(videoId);
};

// Extract video ID from various YouTube URL formats
export const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};
