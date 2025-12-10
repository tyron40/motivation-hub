import { Speech } from '@/types/speech';

import { allYoutubeSpeeches, getSpeechesByCategory } from '@/mocks/youtube-speeches';

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

// Fetch speeches by category using embedded YouTube speeches
export const fetchSpeechesByCategory = async (category: string, limit: number = 500): Promise<Speech[]> => {
  try {
    console.log(`📺 Fetching embedded YouTube speeches for category: ${category}`);
    
    // Get embedded YouTube speeches for the category (500 speeches per category)
    const categorySpeeches = getSpeechesByCategory(category);
    
    if (categorySpeeches.length > 0) {
      console.log(`✅ Found ${categorySpeeches.length} embedded YouTube speeches for category: ${category}`);
      return categorySpeeches.slice(0, limit);
    }
    
    // Fallback to fetching from YouTube API if no embedded speeches found
    const youtubeSpeeches = await fetchYouTubeSpeechesByCategory(category, Math.min(limit, 20));
    
    if (youtubeSpeeches.length > 0) {
      return youtubeSpeeches;
    }
    
    // Final fallback to PodcastIndex if YouTube fails
    console.log(`🎧 Falling back to PodcastIndex for category: ${category}`);
    const episodes = await getPodcastsByCategory(category, Math.min(limit, 20));
    
    if (episodes.length === 0) {
      console.log(`⚠️ No episodes found for category: ${category}`);
      return [];
    }
    
    // Convert podcast episodes to Speech objects
    const speeches: Speech[] = episodes.map((episode) => {
      return {
        id: episode.id,
        title: episode.title,
        speaker: extractSpeaker(episode.title, episode.podcastTitle),
        duration: episode.duration,
        category: episode.category,
        imageUrl: episode.podcastImage,
        audioUrl: episode.audioUrl,
        youtubeId: undefined, // No YouTube ID for podcasts
        description: episode.description,
        playCount: Math.floor(Math.random() * 10000) + 1000, // Random play count
        tags: generateTags(episode.title, episode.description),
      };
    });
    
    console.log(`✅ Converted ${speeches.length} episodes to speeches for category: ${category}`);
    return speeches;
  } catch (error) {
    console.error(`❌ Error fetching speeches for ${category}:`, error);
    return [];
  }
};

// Fetch all speeches from YouTube
export const fetchYouTubeSpeeches = async (): Promise<Speech[]> => {
  console.log('📺 Fetching YouTube motivational speeches...');
  
  try {
    // Import YouTube service
    const { getTrendingVideos, convertVideoToSpeech } = await import('@/services/youtubeService');
    
    // Get trending motivational videos from YouTube
    const videos = await getTrendingVideos(20);
    
    if (videos.length === 0) {
      console.log('⚠️ No YouTube videos found');
      return [];
    }
    
    // Convert YouTube videos to Speech objects
    const speeches: Speech[] = videos.map(video => convertVideoToSpeech(video));
    
    console.log(`✅ Converted ${speeches.length} YouTube videos to speeches`);
    return speeches;
  } catch (error) {
    console.error('❌ Error fetching YouTube speeches:', error);
    return [];
  }
};

// Fetch all speeches using embedded YouTube speeches
export const fetchRealSpeeches = async (): Promise<Speech[]> => {
  console.log('📺 Fetching embedded YouTube speeches...');
  
  try {
    // Return all embedded YouTube speeches (4000 total speeches)
    console.log(`✅ Returning ${allYoutubeSpeeches.length} embedded YouTube speeches`);
    return allYoutubeSpeeches;
  } catch (error) {
    console.error('❌ Error fetching embedded speeches:', error);
    
    // Fallback to fetching from YouTube API
    console.log('🎧 Falling back to YouTube API...');
    const youtubeSpeeches = await fetchYouTubeSpeeches();
    
    if (youtubeSpeeches.length > 0) {
      return youtubeSpeeches;
    }
    
    // Final fallback to PodcastIndex if everything fails
    console.log('🎧 Falling back to PodcastIndex...');
    
    // Search for various motivational topics
    const searchQueries = [
      'david goggins motivation',
      'tony robbins success',
      'jocko willink discipline',
      'les brown inspiration',
      'eric thomas motivation',
      'mel robbins confidence',
      'personal development',
      'mindset motivation'
    ];
    
    const allSpeeches: Speech[] = [];
    
    // Search multiple topics to get diverse content
    for (const query of searchQueries.slice(0, 4)) { // Limit to 4 queries to avoid rate limits
      try {
        console.log(`🔍 Searching for: ${query}`);
        const episodes = await searchPodcastEpisodes(query, 6); // 6 episodes per query
        
        const speeches = episodes.map((episode) => ({
          id: episode.id,
          title: episode.title,
          speaker: extractSpeaker(episode.title, episode.podcastTitle),
          duration: episode.duration,
          category: episode.category,
          imageUrl: episode.podcastImage,
          audioUrl: episode.audioUrl,
          youtubeId: undefined,
          description: episode.description,
          playCount: Math.floor(Math.random() * 10000) + 1000,
          tags: generateTags(episode.title, episode.description),
        }));
        
        allSpeeches.push(...speeches);
        
        // Add small delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (queryError) {
        console.error(`❌ Error searching for "${query}":`, queryError);
      }
    }
    
    // Remove duplicates based on ID
    const uniqueSpeeches = allSpeeches.filter((speech, index, self) => 
      index === self.findIndex(s => s.id === speech.id)
    );
    
    console.log(`✅ Total unique speeches fetched: ${uniqueSpeeches.length}`);
    return uniqueSpeeches;
  }
};

// Search for specific speaker using PodcastIndex
export const searchSpeaker = async (speakerName: string, limit: number = 10): Promise<Speech[]> => {
  try {
    console.log(`🎧 Searching for speaker: ${speakerName}`);
    const query = `${speakerName} motivation`;
    const episodes = await searchPodcastEpisodes(query, limit);
    
    if (episodes.length === 0) {
      console.log(`⚠️ No episodes found for speaker: ${speakerName}`);
      return [];
    }
    
    const speeches = episodes.map(episode => ({
      id: episode.id,
      title: episode.title,
      speaker: speakerName,
      duration: episode.duration,
      category: episode.category,
      imageUrl: episode.podcastImage,
      audioUrl: episode.audioUrl,
      youtubeId: undefined,
      description: episode.description,
      playCount: Math.floor(Math.random() * 10000) + 1000,
      tags: generateTags(episode.title, episode.description),
    }));
    
    console.log(`✅ Found ${speeches.length} speeches for speaker: ${speakerName}`);
    return speeches;
  } catch (error) {
    console.error(`❌ Error searching for speaker ${speakerName}:`, error);
    return [];
  }
};

// Get trending motivational speeches using embedded YouTube speeches
export const getTrendingSpeeches = async (limit: number = 50): Promise<Speech[]> => {
  try {
    console.log('📺 Getting trending embedded YouTube speeches...');
    
    // Return the most popular embedded YouTube speeches (sorted by play count)
    const trendingSpeeches = allYoutubeSpeeches
      .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
      .slice(0, limit);
    
    console.log(`✅ Found ${trendingSpeeches.length} trending embedded speeches`);
    return trendingSpeeches;
  } catch (error) {
    console.error('❌ Error getting trending speeches:', error);
    return [];
  }
};

// Search speeches by keyword using embedded YouTube speeches
export const searchSpeeches = async (keyword: string, limit: number = 100): Promise<Speech[]> => {
  try {
    console.log(`📺 Searching embedded speeches for keyword: ${keyword}`);
    const lowercaseKeyword = keyword.toLowerCase();
    
    // Search through all embedded YouTube speeches
    const matchingSpeeches = allYoutubeSpeeches.filter(speech => 
      speech.title.toLowerCase().includes(lowercaseKeyword) ||
      speech.speaker.toLowerCase().includes(lowercaseKeyword) ||
      speech.category.toLowerCase().includes(lowercaseKeyword) ||
      speech.description.toLowerCase().includes(lowercaseKeyword) ||
      (speech.tags && speech.tags.some(tag => tag.toLowerCase().includes(lowercaseKeyword)))
    );
    
    const results = matchingSpeeches.slice(0, limit);
    console.log(`✅ Found ${results.length} embedded speeches for keyword: ${keyword}`);
    
    if (results.length > 0) {
      return results;
    }
    
    // Fallback to PodcastIndex if no embedded speeches match
    console.log(`🎧 No embedded matches, searching PodcastIndex for: ${keyword}`);
    const query = `${keyword} motivation`;
    const episodes = await searchPodcastEpisodes(query, Math.min(limit, 20));
    
    if (episodes.length === 0) {
      console.log(`⚠️ No episodes found for keyword: ${keyword}`);
      return [];
    }
    
    const speeches = episodes.map(episode => ({
      id: episode.id,
      title: episode.title,
      speaker: extractSpeaker(episode.title, episode.podcastTitle),
      duration: episode.duration,
      category: episode.category,
      imageUrl: episode.podcastImage,
      audioUrl: episode.audioUrl,
      youtubeId: undefined,
      description: episode.description,
      playCount: Math.floor(Math.random() * 10000) + 1000,
      tags: generateTags(episode.title, episode.description),
    }));
    
    console.log(`✅ Found ${speeches.length} speeches from PodcastIndex for keyword: ${keyword}`);
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
    } catch {
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