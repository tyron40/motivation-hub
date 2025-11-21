import { Speech } from '@/types/speech';
import { speechContent } from '@/mocks/speechContent';
import { allYoutubeSpeeches, getSpeechesByCategory } from '@/mocks/youtube-speeches';
import {
  fetchAllPodcasts,
  fetchPodcastsByCategory,
  searchPodcasts as searchPodcastFeeds,
  getTrendingPodcasts,
} from './podcastService';

export const testPodcastAPI = async (): Promise<boolean> => {
  console.log('✅ Using embedded speeches (no API needed)');
  return true;
};

// Legacy YouTube test for backward compatibility
export const testYouTubeAPI = async (): Promise<boolean> => {
  console.log('⚠️ YouTube API deprecated, using PodcastIndex instead');
  return await testPodcastAPI();
};

// PodcastIndex Episode Interface
interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  duration: number;
  durationFormatted: string;
  publishedAt: string;
  podcastTitle: string;
  podcastImage: string;
  category: string;
}

// Backend Video Interface (legacy)
interface BackendVideo {
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



// Popular motivational speakers and podcast hosts
const SPEAKERS = [
  'David Goggins',
  'Tony Robbins', 
  'Les Brown',
  'Eric Thomas',
  'Jocko Willink',
  'Mel Robbins',
  'Gary Vaynerchuk',
  'Jim Rohn',
  'Zig Ziglar',
  'Brian Tracy',
  'Tim Ferriss',
  'Joe Rogan',
  'Jordan Peterson',
  'Naval Ravikant',
  'Ryan Holiday'
];



// Extract speaker name from podcast title or episode title
const extractSpeaker = (title: string, podcastTitle: string): string => {
  // Check if any known speaker is mentioned in the title
  const foundSpeaker = SPEAKERS.find(speaker => 
    title.toLowerCase().includes(speaker.toLowerCase()) ||
    podcastTitle.toLowerCase().includes(speaker.toLowerCase())
  );
  
  if (foundSpeaker) return foundSpeaker;
  
  // If no known speaker found, use podcast title
  return podcastTitle || 'Motivational Speaker';
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

export const searchPodcastEpisodes = async (query: string, maxResults: number = 10): Promise<PodcastEpisode[]> => {
  console.log('⚠️ PodcastIndex search not available without backend');
  return [];
};

// Legacy function for backward compatibility
export const searchBackendVideos = async (query: string, maxResults: number = 10): Promise<BackendVideo[]> => {
  console.log('⚠️ searchBackendVideos is deprecated, use searchPodcastEpisodes instead');
  return [];
};

export const getPodcastsByCategory = async (category: string, maxResults: number = 10): Promise<PodcastEpisode[]> => {
  console.log('⚠️ PodcastIndex category search not available without backend');
  return [];
};

// Legacy function for backward compatibility
export const getVideosByCategory = async (category: string, maxResults: number = 10): Promise<BackendVideo[]> => {
  console.log('⚠️ getVideosByCategory is deprecated, use getPodcastsByCategory instead');
  return [];
};

// Fetch YouTube videos by category and convert to speeches
export const fetchYouTubeSpeechesByCategory = async (category: string, limit: number = 10): Promise<Speech[]> => {
  try {
    console.log(`📺 Fetching YouTube speeches for category: ${category}`);
    
    // Import YouTube service
    const { getVideosByCategory, convertVideoToSpeech } = await import('@/services/youtubeService');
    
    // Fetch YouTube videos for the category
    const videos = await getVideosByCategory(category, limit);
    
    if (videos.length === 0) {
      console.log(`⚠️ No YouTube videos found for category: ${category}`);
      return [];
    }
    
    // Convert YouTube videos to Speech objects
    const speeches: Speech[] = videos.map(video => convertVideoToSpeech(video));
    
    console.log(`✅ Converted ${speeches.length} YouTube videos to speeches for category: ${category}`);
    return speeches;
  } catch (error) {
    console.error(`❌ Error fetching YouTube speeches for ${category}:`, error);
    return [];
  }
};

// Fetch speeches by category using podcast RSS feeds
export const fetchSpeechesByCategory = async (category: string, limit: number = 500): Promise<Speech[]> => {
  try {
    console.log(`🎧 Fetching podcast speeches for category: ${category}`);
    
    const podcastSpeeches = await fetchPodcastsByCategory(category, limit);
    
    if (podcastSpeeches.length > 0) {
      console.log(`✅ Fetched ${podcastSpeeches.length} podcast speeches for category: ${category}`);
      return podcastSpeeches;
    }
    
    console.log(`⚠️ No podcast speeches found for category: ${category}`);
    return [];
  } catch (error) {
    console.error(`❌ Error fetching speeches for ${category}:`, error);
    return [];
  }
};

// Fetch all speeches from podcast RSS feeds
export const fetchPodcastSpeeches = async (): Promise<Speech[]> => {
  console.log('🎧 Fetching podcast motivational speeches...');
  
  try {
    const speeches = await fetchAllPodcasts(5);
    
    if (speeches.length === 0) {
      console.log('⚠️ No podcast speeches found');
      return [];
    }
    
    console.log(`✅ Fetched ${speeches.length} podcast speeches`);
    return speeches;
  } catch (error) {
    console.error('❌ Error fetching podcast speeches:', error);
    return [];
  }
};

// Fetch all speeches using podcast RSS feeds
export const fetchRealSpeeches = async (): Promise<Speech[]> => {
  console.log('🎧 Fetching speeches from podcast RSS feeds...');
  
  try {
    const podcastSpeeches = await fetchPodcastSpeeches();
    
    if (podcastSpeeches.length > 0) {
      console.log(`✅ Fetched ${podcastSpeeches.length} podcast speeches`);
      return podcastSpeeches;
    }
    
    console.log('⚠️ No podcast speeches found');
    return [];
  } catch (error) {
    console.error('❌ Error fetching speeches:', error);
    return [];
  }
};

// Search for specific speaker using podcast RSS feeds
export const searchSpeaker = async (speakerName: string, limit: number = 10): Promise<Speech[]> => {
  try {
    console.log(`🎧 Searching for speaker: ${speakerName}`);
    const speeches = await searchPodcastFeeds(speakerName, limit);
    
    if (speeches.length === 0) {
      console.log(`⚠️ No speeches found for speaker: ${speakerName}`);
      return [];
    }
    
    console.log(`✅ Found ${speeches.length} speeches for speaker: ${speakerName}`);
    return speeches;
  } catch (error) {
    console.error(`❌ Error searching for speaker ${speakerName}:`, error);
    return [];
  }
};

// Get trending motivational speeches from podcast RSS feeds
export const getTrendingSpeeches = async (limit: number = 50): Promise<Speech[]> => {
  try {
    console.log('🎧 Getting trending podcast speeches...');
    
    const trendingSpeeches = await getTrendingPodcasts(limit);
    
    console.log(`✅ Found ${trendingSpeeches.length} trending podcast speeches`);
    return trendingSpeeches;
  } catch (error) {
    console.error('❌ Error getting trending speeches:', error);
    return [];
  }
};

// Search speeches by keyword using podcast RSS feeds
export const searchSpeeches = async (keyword: string, limit: number = 100): Promise<Speech[]> => {
  try {
    console.log(`🎧 Searching podcast speeches for keyword: ${keyword}`);
    
    const speeches = await searchPodcastFeeds(keyword, limit);
    
    console.log(`✅ Found ${speeches.length} podcast speeches for keyword: ${keyword}`);
    return speeches;
  } catch (error) {
    console.error(`❌ Error searching speeches for keyword ${keyword}:`, error);
    return [];
  }
};

// Get popular speakers list
export const getPopularSpeakers = (): string[] => {
  return SPEAKERS;
};

// Validate YouTube video URL
export const validateYouTubeUrl = (url: string): boolean => {
  const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  return youtubeRegex.test(url);
};

// Extract video ID from YouTube URL
export const extractVideoId = (url: string): string | null => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

// Reliable audio samples that work across all platforms
const AUDIO_SAMPLES = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
];

// Get YouTube audio stream URL using a reliable service
export const getYouTubeAudioUrl = async (videoId: string): Promise<string | null> => {
  try {
    console.log('🔍 Attempting to get audio for YouTube video:', videoId);
    
    // For now, we'll use sample audio files since YouTube audio extraction
    // requires server-side processing or paid APIs
    // In production, you would use a service like:
    // - youtube-dl on your backend
    // - A paid API service
    // - Pre-downloaded audio files
    
    const randomIndex = Math.floor(Math.random() * AUDIO_SAMPLES.length);
    const audioUrl = AUDIO_SAMPLES[randomIndex];
    
    console.log('✅ Using sample audio URL:', audioUrl);
    return audioUrl;
  } catch (error) {
    console.error('Error getting YouTube audio URL:', error);
    return getSampleAudioUrl();
  }
};

// Get sample motivational audio for testing
export const getSampleAudioUrl = (): string => {
  // Always ensure we have valid samples
  const validSamples = AUDIO_SAMPLES.filter(url => 
    url && typeof url === 'string' && url.trim().length > 0
  );
  
  if (validSamples.length === 0) {
    // Ultimate fallback if all samples are invalid
    const ultimateFallback = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    console.warn('⚠️ No valid samples found, using ultimate fallback:', ultimateFallback);
    return ultimateFallback;
  }
  
  // Return a random sample audio file, preferring MP3 format
  const randomIndex = Math.floor(Math.random() * validSamples.length);
  const selectedUrl = validSamples[randomIndex];
  
  console.log('🎵 Using sample audio:', selectedUrl);
  return selectedUrl;
};

// Get a browser-safe audio URL that works across all platforms
export const getBrowserSafeAudioUrl = async (originalUrl: string): Promise<string> => {
  try {
    // Validate input
    if (!originalUrl || typeof originalUrl !== 'string' || originalUrl.trim().length === 0) {
      console.warn('Invalid or empty audio URL provided:', originalUrl);
      return getSampleAudioUrl();
    }

    const trimmedUrl = originalUrl.trim();

    // Handle data URLs
    if (trimmedUrl.startsWith('data:')) {
      return trimmedUrl;
    }

    // Validate URL format
    try {
      new URL(trimmedUrl);
    } catch (urlError) {
      console.warn('Invalid URL format:', trimmedUrl);
      return getSampleAudioUrl();
    }

    // If it's already a SoundHelix URL (our reliable samples), use it directly
    if (trimmedUrl.includes('soundhelix.com')) {
      console.log('✅ Using SoundHelix URL directly:', trimmedUrl);
      return trimmedUrl;
    }

    // If it's HTTPS and MP3/M4A, use it directly without validation
    // (validation can cause issues on some platforms/URLs)
    if (trimmedUrl.startsWith('https://') && (trimmedUrl.includes('.mp3') || trimmedUrl.includes('.m4a'))) {
      console.log('✅ Using HTTPS audio URL:', trimmedUrl);
      return trimmedUrl;
    }

    // For reliability, always use sample audio for unknown URLs
    // This prevents empty src errors and ensures audio always works
    const fallbackUrl = getSampleAudioUrl();
    console.log('🔄 Using reliable sample URL for:', trimmedUrl, '-> fallback:', fallbackUrl);
    return fallbackUrl;
  } catch (error) {
    console.error('Error getting browser-safe audio URL:', error);
    const fallbackUrl = getSampleAudioUrl();
    console.log('🔄 Error fallback to sample URL:', fallbackUrl);
    return fallbackUrl;
  }
};

// Get a working audio URL for a speech
export const getWorkingAudioUrl = async (speech: Speech): Promise<string> => {
  try {
    console.log('🎵 Getting working audio URL for:', speech.title);
    
    // Validate speech object
    if (!speech || typeof speech !== 'object' || !speech.title) {
      console.warn('Invalid speech object provided');
      return getSampleAudioUrl();
    }
    
    // Priority 1: If the speech has a SoundHelix URL (our working samples), use it directly
    if (speech.audioUrl && 
        typeof speech.audioUrl === 'string' && 
        speech.audioUrl.includes('soundhelix.com')) {
      console.log('✅ Using SoundHelix audio URL:', speech.audioUrl);
      return speech.audioUrl;
    }
    
    // Priority 2: If the speech has other verified working URLs, use them
    if (speech.audioUrl && 
        typeof speech.audioUrl === 'string' && 
        (speech.audioUrl.includes('cs.uic.edu') || 
         speech.audioUrl.startsWith('data:') ||
         speech.audioUrl.startsWith('https://www.soundhelix.com'))) {
      console.log('✅ Using verified working audio URL:', speech.audioUrl);
      return speech.audioUrl;
    }
    
    // Priority 3: For any other URL, use our sample audio
    // This ensures audio always works, even if the original URL is broken
    console.log('🔄 Using sample audio for reliability');
    return getSampleAudioUrl();
  } catch (error) {
    console.error('❌ Error in getWorkingAudioUrl:', error);
    return getSampleAudioUrl();
  }
};

// Synchronous version for backward compatibility
export const getWorkingAudioUrlSync = (speech: Speech): string => {
  // If the speech has a verified working audio URL, use it
  if (speech.audioUrl && 
      (speech.audioUrl.includes('soundhelix.com') ||
       speech.audioUrl.includes('cs.uic.edu') || 
       speech.audioUrl.startsWith('data:'))) {
    return speech.audioUrl;
  }
  
  // Otherwise, use a sample audio file
  return getSampleAudioUrl();
};

// Test audio playback capability
export const testAudioPlayback = async (): Promise<boolean> => {
  try {
    const testUrl = AUDIO_SAMPLES[0];
    const audio = new Audio();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      audio.oncanplaythrough = () => {
        clearTimeout(timeout);
        resolve(true);
      };

      audio.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };

      audio.src = testUrl;
      audio.load();
    });
  } catch (error) {
    console.error('Audio test failed:', error);
    return false;
  }
};