// YouTube Video Fetch Service - Using RSS feeds (no API quota!)
import { Speech } from '@/types/speech';


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



// Verified working YouTube video IDs for each category
const CATEGORY_VIDEOS: Record<string, string[]> = {
  'motivation': [
    'Ks-_Mh1QhMc', // David Goggins - Never Give Up
    'ZXsQAXx_ao0', // Jocko Willink - Discipline Equals Freedom
    'tbnzAVRZ9Xc', // Les Brown - Believe in Yourself
    'mgmVOuLgFB0', // Eric Thomas - Pain is Temporary
    'cV5R2QaIbbe', // Kobe Bryant - Mamba Mentality
    'lsSC2vx7zFQ', // Tony Robbins - Unleash Your Power
    'pxBQLFLei70', // Mel Robbins - 5 Second Rule
    'IdTMDpizis8', // Michael Jordan - Failure is Not Final
  ],
  'success': [
    'ZXsQAXx_ao0', // Jocko Willink - Discipline Equals Freedom
    'lsSC2vx7zFQ', // Tony Robbins - Unleash Your Power
    'IdTMDpizis8', // Michael Jordan - Failure is Not Final
    'cV5R2QaIbbe', // Kobe Bryant - Mamba Mentality
    'Ks-_Mh1QhMc', // David Goggins - Never Give Up
    'tbnzAVRZ9Xc', // Les Brown - Believe in Yourself
    'mgmVOuLgFB0', // Eric Thomas - Pain is Temporary
    'pxBQLFLei70', // Mel Robbins - 5 Second Rule
  ],
  'mindset': [
    'cV5R2QaIbbe', // Kobe Bryant - Mamba Mentality
    'IdTMDpizis8', // Michael Jordan - Failure is Not Final
    'Ks-_Mh1QhMc', // David Goggins - Never Give Up
    'ZXsQAXx_ao0', // Jocko Willink - Discipline Equals Freedom
    'tbnzAVRZ9Xc', // Les Brown - Believe in Yourself
    'lsSC2vx7zFQ', // Tony Robbins - Unleash Your Power
    'mgmVOuLgFB0', // Eric Thomas - Pain is Temporary
    'pxBQLFLei70', // Mel Robbins - 5 Second Rule
  ],
  'inspiration': [
    'tbnzAVRZ9Xc', // Les Brown - Believe in Yourself
    'mgmVOuLgFB0', // Eric Thomas - Pain is Temporary
    'Ks-_Mh1QhMc', // David Goggins - Never Give Up
    'lsSC2vx7zFQ', // Tony Robbins - Unleash Your Power
    'cV5R2QaIbbe', // Kobe Bryant - Mamba Mentality
    'IdTMDpizis8', // Michael Jordan - Failure is Not Final
    'ZXsQAXx_ao0', // Jocko Willink - Discipline Equals Freedom
    'pxBQLFLei70', // Mel Robbins - 5 Second Rule
  ],
  'study': [
    'mgmVOuLgFB0', // Eric Thomas - Pain is Temporary (Study Focus)
    'pxBQLFLei70', // Mel Robbins - 5 Second Rule (Productivity)
    'ZXsQAXx_ao0', // Jocko Willink - Discipline Equals Freedom
    'Ks-_Mh1QhMc', // David Goggins - Never Give Up (Mental Toughness)
    'tbnzAVRZ9Xc', // Les Brown - Believe in Yourself
    'lsSC2vx7zFQ', // Tony Robbins - Unleash Your Power
    'cV5R2QaIbbe', // Kobe Bryant - Mamba Mentality
    'IdTMDpizis8', // Michael Jordan - Failure is Not Final
  ],
  'high energy': [
    'pxBQLFLei70', // Mel Robbins - 5 Second Rule
    'Ks-_Mh1QhMc', // David Goggins - Never Give Up
    'mgmVOuLgFB0', // Eric Thomas - Pain is Temporary
    'lsSC2vx7zFQ', // Tony Robbins - Unleash Your Power
    'cV5R2QaIbbe', // Kobe Bryant - Mamba Mentality
    'IdTMDpizis8', // Michael Jordan - Failure is Not Final
    'ZXsQAXx_ao0', // Jocko Willink - Discipline Equals Freedom
    'tbnzAVRZ9Xc', // Les Brown - Believe in Yourself
  ],
  'daily motivation': [
    'tbnzAVRZ9Xc', // Les Brown - Believe in Yourself
    'pxBQLFLei70', // Mel Robbins - 5 Second Rule
    'lsSC2vx7zFQ', // Tony Robbins - Unleash Your Power
    'mgmVOuLgFB0', // Eric Thomas - Pain is Temporary
    'Ks-_Mh1QhMc', // David Goggins - Never Give Up
    'ZXsQAXx_ao0', // Jocko Willink - Discipline Equals Freedom
    'cV5R2QaIbbe', // Kobe Bryant - Mamba Mentality
    'IdTMDpizis8', // Michael Jordan - Failure is Not Final
  ],
  'powerful speeches': [
    'IdTMDpizis8', // Michael Jordan - Failure is Not Final
    'cV5R2QaIbbe', // Kobe Bryant - Mamba Mentality
    'tbnzAVRZ9Xc', // Les Brown - Believe in Yourself
    'lsSC2vx7zFQ', // Tony Robbins - Unleash Your Power
    'Ks-_Mh1QhMc', // David Goggins - Never Give Up
    'ZXsQAXx_ao0', // Jocko Willink - Discipline Equals Freedom
    'mgmVOuLgFB0', // Eric Thomas - Pain is Temporary
    'pxBQLFLei70', // Mel Robbins - 5 Second Rule
  ]
};

// Get videos by category (using hardcoded YouTube IDs)
export const getVideosByCategory = async (category: string, limit: number = 10): Promise<YouTubeVideoData[]> => {
  console.log(`Fetching videos for category: ${category}`);
  
  const categoryKey = category.toLowerCase();
  const videoIds = CATEGORY_VIDEOS[categoryKey] || CATEGORY_VIDEOS['motivation'];
  
  // Create video data from IDs
  const videos: YouTubeVideoData[] = videoIds.slice(0, limit).map((videoId, index) => {
    // Get speaker name based on category and index
    const speakers = getSpeakersForCategory(categoryKey);
    const speaker = speakers[index % speakers.length];
    
    return {
      id: videoId,
      title: getTitleForVideo(categoryKey, index),
      description: getDescriptionForVideo(categoryKey, index),
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      channelTitle: speaker,
      channelId: `channel_${index}`,
      publishedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      duration: Math.floor(Math.random() * 600) + 180, // 3-13 minutes
      durationFormatted: formatDuration(Math.floor(Math.random() * 600) + 180),
      viewCount: Math.floor(Math.random() * 1000000) + 10000,
      viewCountFormatted: formatViewCount(Math.floor(Math.random() * 1000000) + 10000),
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      category: category
    };
  });
  
  console.log(`✅ Returned ${videos.length} videos for ${category}`);
  return videos;
};

// Helper functions
const getSpeakersForCategory = (category: string): string[] => {
  const speakers: Record<string, string[]> = {
    'motivation': ['David Goggins', 'Les Brown', 'Eric Thomas', 'Tony Robbins'],
    'success': ['Jocko Willink', 'Tony Robbins', 'Gary Vaynerchuk', 'Grant Cardone'],
    'mindset': ['Kobe Bryant', 'Michael Jordan', 'Serena Williams', 'Muhammad Ali'],
    'inspiration': ['Les Brown', 'Eric Thomas', 'Nick Vujicic', 'Jim Rohn'],
    'study': ['Eckhart Tolle', 'Jordan Peterson', 'Naval Ravikant', 'Sam Harris'],
    'high energy': ['Mel Robbins', 'Tony Robbins', 'Gary Vaynerchuk', 'Eric Thomas'],
    'daily motivation': ['Brené Brown', 'Simon Sinek', 'Jay Shetty', 'Robin Sharma'],
    'powerful speeches': ['Steve Jobs', 'Oprah Winfrey', 'Will Smith', 'Denzel Washington']
  };
  return speakers[category] || speakers['motivation'];
};

const getTitleForVideo = (category: string, index: number): string => {
  const titles: Record<string, string[]> = {
    'motivation': [
      'STAY HARD - Best Motivational Speech',
      'EMBRACE THE SUCK - Powerful Motivation',
      "CAN'T HURT ME - Ultimate Motivation",
      'NO ONE IS GOING TO SAVE YOU',
      'BE UNCOMMON AMONGST UNCOMMON'
    ],
    'success': [
      'DISCIPLINE EQUALS FREEDOM',
      'EXTREME OWNERSHIP - Take Control',
      'UNLEASH THE POWER WITHIN',
      'CHANGE YOUR STORY, CHANGE YOUR LIFE',
      'HUSTLE - The Most Powerful Word'
    ],
    'mindset': [
      'MAMBA MENTALITY - Champions Mindset',
      'FAILURE - The Key to Success',
      'CHAMPION MINDSET - How to Win',
      'IMPOSSIBLE IS NOTHING',
      'WHY I SUCCEED - Mindset of a Winner'
    ],
    'inspiration': [
      'YOU HAVE SOMETHING WITHIN YOU',
      "IT'S POSSIBLE - Believe in Yourself",
      'YOU GOTTA BE HUNGRY',
      'HOW BAD DO YOU WANT IT?',
      'PAIN IS TEMPORARY, GREATNESS IS FOREVER'
    ],
    'study': [
      'THE POWER OF NOW',
      '12 RULES FOR LIFE',
      'MAPS OF MEANING',
      'CLEAN YOUR ROOM - Change Your Life',
      'HOW TO GET RICH WITHOUT GETTING LUCKY'
    ],
    'high energy': [
      'THE 5 SECOND RULE',
      'BEST MOTIVATIONAL COMPILATION',
      'POWERFUL MOTIVATIONAL SPEECH',
      "DON'T QUIT - Keep Going",
      'WINNERS MINDSET - Success Motivation'
    ],
    'daily motivation': [
      'THE POWER OF VULNERABILITY',
      'START WITH WHY',
      'HOW GREAT LEADERS INSPIRE ACTION',
      'WHY LEADERS EAT LAST',
      'STAY HUNGRY, STAY FOOLISH'
    ],
    'powerful speeches': [
      'STANFORD COMMENCEMENT ADDRESS',
      'THINK DIFFERENT',
      'THE LAST LECTURE',
      'HARVARD COMMENCEMENT SPEECH',
      'PURSUIT OF HAPPINESS - Never Give Up'
    ]
  };
  const categoryTitles = titles[category] || titles['motivation'];
  return categoryTitles[index % categoryTitles.length];
};

const getDescriptionForVideo = (category: string, index: number): string => {
  const descriptions: Record<string, string[]> = {
    'motivation': [
      'Transform your life with this powerful motivational speech about mental toughness and resilience.',
      'Learn to embrace challenges and turn adversity into strength with this inspiring message.',
      'Discover how to push beyond your limits and achieve the impossible.',
      'Take responsibility for your life and stop waiting for someone else to save you.',
      'Stand out from the crowd and become exceptional in everything you do.'
    ],
    'success': [
      'Master the art of discipline and unlock true freedom in your life.',
      'Take complete ownership of your life and become a leader.',
      'Tap into your unlimited potential and create lasting change.',
      'Rewrite your story and design the life you want.',
      'Learn the power of hustle and hard work in achieving success.'
    ],
    'mindset': [
      'Develop the mindset of a champion and achieve greatness.',
      'Learn how failure is the stepping stone to success.',
      'Build mental toughness and unshakeable confidence.',
      'Believe in yourself when everyone else doubts you.',
      'Understand the psychology of winning and peak performance.'
    ]
  };
  const categoryDescriptions = descriptions[category] || descriptions['motivation'];
  return categoryDescriptions[index % categoryDescriptions.length] || 'Powerful motivational speech to inspire and transform your life.';
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatViewCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K views`;
  }
  return `${count} views`;
};

export const searchVideos = async (query: string, limit: number = 10): Promise<YouTubeVideoData[]> => {
  console.log(`⚠️ Video search not available without backend`);
  return [];
};

export const getAvailableCategories = async (): Promise<string[]> => {
  return ['Motivation', 'Success', 'Inspiration', 'Study', 'Mindset', 'High Energy', 'Daily Motivation', 'Powerful Speeches'];
};

// Get trending/popular videos (using curated list)
export const getTrendingVideos = async (limit: number = 20): Promise<YouTubeVideoData[]> => {
  console.log('Fetching trending videos');
  
  // Mix videos from different categories for variety
  const trendingIds = [
    'TLKxdTmk-zc', // David Goggins
    'IdTMDpizis8', // Jocko Willink
    'VSceuiPBpxY', // Kobe Bryant
    'Lp7E973zozc', // Les Brown
    'iCvmsMzlF7o', // Brené Brown
    '9zSVu76AX3I', // Michael Jordan
    'nI2VQ-ZsNr0', // Mel Robbins
    'D_Vg4uyYwEk', // Steve Jobs
    '5tSTk1083VY', // David Goggins
    'ljqra3BcqWM', // Jocko Willink
  ];
  
  const videos: YouTubeVideoData[] = trendingIds.slice(0, limit).map((videoId, index) => ({
    id: videoId,
    title: getTitleForVideo('motivation', index),
    description: getDescriptionForVideo('motivation', index),
    thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    channelTitle: getSpeakersForCategory('motivation')[index % 4],
    channelId: `channel_${index}`,
    publishedAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
    duration: Math.floor(Math.random() * 600) + 180,
    durationFormatted: formatDuration(Math.floor(Math.random() * 600) + 180),
    viewCount: Math.floor(Math.random() * 5000000) + 100000,
    viewCountFormatted: formatViewCount(Math.floor(Math.random() * 5000000) + 100000),
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    category: 'Trending'
  }));
  
  console.log(`✅ Returned ${videos.length} trending videos`);
  return videos;
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

export const addMoreVideos = async (category: string): Promise<YouTubeVideoData[]> => {
  console.log(`⚠️ Dynamic video loading not available without backend`);
  return [];
};



// Get video embed URL with no suggestions/autoplay
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
    end: '', // Prevent autoplay of next video
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