import { Speech } from '@/types/speech';
import { trpcClient } from '@/lib/trpc';

export interface PodcastFeed {
  name: string;
  rssUrl: string;
  category: string;
  speaker: string;
  imageUrl: string;
}

export const MOTIVATIONAL_PODCASTS: PodcastFeed[] = [
  {
    name: 'Motivation Daily by Motiversity',
    rssUrl: 'https://feeds.megaphone.fm/motiversity',
    category: 'motivation',
    speaker: 'Motiversity',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/97/22/5f/97225f53-7c09-9c4e-ced1-f1bac8b6ff96/mza_7859501868906759766.jpg/600x600bb.jpg',
  },
  {
    name: 'The Tony Robbins Podcast',
    rssUrl: 'https://feeds.feedburner.com/thetonyrobbinspodcast',
    category: 'success',
    speaker: 'Tony Robbins',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts115/v4/4e/3d/bc/4e3dbc1d-6b3c-9c40-d1d8-e00c62e6e1b3/mza_7859501868906759766.jpg/600x600bb.jpg',
  },
  {
    name: 'The School of Greatness',
    rssUrl: 'https://feeds.megaphone.fm/school-of-greatness',
    category: 'inspiration',
    speaker: 'Lewis Howes',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/3b/13/0b/3b130ba6-07bd-b4f9-4f5a-11f0c2f8f5f5/mza_7859501868906759766.jpg/600x600bb.jpg',
  },
  {
    name: 'Impact Theory',
    rssUrl: 'https://feeds.megaphone.fm/impact-theory',
    category: 'mindset',
    speaker: 'Tom Bilyeu',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/99/8c/c4/998cc440-d4cf-8eef-3f2e-5b1b4e8d8f5f/mza_7859501868906759766.jpg/600x600bb.jpg',
  },
  {
    name: 'The Tim Ferriss Show',
    rssUrl: 'https://rss.art19.com/tim-ferriss-show',
    category: 'success',
    speaker: 'Tim Ferriss',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/78/06/99/780699d5-8b2c-0e0e-7b7c-9e1c2f8f5f5f/mza_7859501868906759766.jpg/600x600bb.jpg',
  },
  {
    name: 'The Daily Boost',
    rssUrl: 'https://feeds.megaphone.fm/the-daily-boost',
    category: 'daily motivation',
    speaker: 'Scott Smith',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts115/v4/8d/e6/40/8de640e4-3c2f-2b7e-7b8d-9e1c2f8f5f5f/mza_7859501868906759766.jpg/600x600bb.jpg',
  },
  {
    name: 'Optimal Living Daily',
    rssUrl: 'https://feeds.megaphone.fm/optimal-living-daily',
    category: 'inspiration',
    speaker: 'Justin Malik',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts125/v4/0f/3e/c7/0f3ec7a5-8b2c-0e0e-7b7c-9e1c2f8f5f5f/mza_7859501868906759766.jpg/600x600bb.jpg',
  },
  {
    name: 'The Ed Mylett Show',
    rssUrl: 'https://feeds.megaphone.fm/the-ed-mylett-show',
    category: 'high energy',
    speaker: 'Ed Mylett',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/6c/3f/8d/6c3f8d40-7b2c-0e0e-7b7c-9e1c2f8f5f5f/mza_7859501868906759766.jpg/600x600bb.jpg',
  },
  {
    name: 'The GaryVee Audio Experience',
    rssUrl: 'https://feeds.megaphone.fm/garyvee',
    category: 'powerful speeches',
    speaker: 'Gary Vaynerchuk',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/9e/7d/4b/9e7d4b40-7b2c-0e0e-7b7c-9e1c2f8f5f5f/mza_7859501868906759766.jpg/600x600bb.jpg',
  },
  {
    name: 'The Mindset Mentor',
    rssUrl: 'https://feeds.megaphone.fm/the-mindset-mentor',
    category: 'mindset',
    speaker: 'Rob Dial',
    imageUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts115/v4/7b/8c/9d/7b8c9d40-7b2c-0e0e-7b7c-9e1c2f8f5f5f/mza_7859501868906759766.jpg/600x600bb.jpg',
  },
];

function parseDuration(durationString: string | undefined): number {
  if (!durationString) return 300;
  
  if (durationString.includes(':')) {
    const parts = durationString.split(':').map(p => parseInt(p, 10));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
  }
  
  const seconds = parseInt(durationString, 10);
  return isNaN(seconds) ? 300 : seconds;
}

function extractImageUrl(item: any, feedImage: string): string {
  if (item.image?.href) return item.image.href;
  if (item.image?.url) return item.image.url;
  if (item.itunes?.image) return item.itunes.image;
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image')) {
    return item.enclosure.url;
  }
  return feedImage;
}

function extractAudioUrl(item: any): string | null {
  if (item.enclosure?.url && item.enclosure.type?.startsWith('audio')) {
    return item.enclosure.url;
  }
  
  if (item.link && (item.link.endsWith('.mp3') || item.link.endsWith('.m4a'))) {
    return item.link;
  }
  
  return null;
}

function generateTags(title: string, description: string): string[] {
  const commonTags = ['motivation', 'inspiration', 'success', 'mindset'];
  const titleWords = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(word => word.length > 4);
  
  return [...commonTags, ...titleWords.slice(0, 4)].slice(0, 8);
}

async function parseRSSFeed(url: string, retries: number = 2): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`📡 Retry attempt ${attempt} for RSS feed: ${url}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      } else {
        console.log(`📡 Requesting RSS feed via backend proxy: ${url}`);
      }
      
      const result = await trpcClient.podcast.rssFeed.query({ url });
      
      console.log(`✅ Received parsed RSS feed with ${result.items.length} items`);
      
      return {
        items: result.items,
        image: result.image,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Error parsing RSS feed (attempt ${attempt + 1}/${retries + 1}):`, error);
      
      if (attempt === retries) {
        break;
      }
    }
  }
  
  console.error('❌ Failed to parse RSS feed after all retries');
  throw lastError || new Error('Failed to fetch RSS feed');
}

export async function fetchPodcastFeed(podcast: PodcastFeed, limit: number = 10): Promise<Speech[]> {
  try {
    console.log(`🎧 Fetching podcast feed: ${podcast.name}`);
    
    const feed = await parseRSSFeed(podcast.rssUrl);
    
    if (!feed.items || feed.items.length === 0) {
      console.log(`⚠️ No episodes found in ${podcast.name}`);
      return [];
    }
    
    const feedImage = feed.image?.url || podcast.imageUrl;
    
    const itemsWithAudio = feed.items
      .slice(0, limit)
      .filter((item: any) => extractAudioUrl(item) !== null);
    
    const speeches: Speech[] = itemsWithAudio.map((item: any) => {
      const audioUrl = extractAudioUrl(item)!;
      const description = item.description || '';
      
      return {
        id: `podcast-${item.guid || item.link || Math.random()}`,
        title: item.title || 'Untitled Episode',
        speaker: podcast.speaker,
        duration: parseDuration(item.duration),
        category: podcast.category,
        imageUrl: extractImageUrl(item, feedImage),
        audioUrl,
        description: description.substring(0, 300),
        playCount: Math.floor(Math.random() * 5000) + 1000,
        tags: generateTags(item.title || '', description),
        isFavorite: false,
      };
    });
    
    console.log(`✅ Fetched ${speeches.length} episodes from ${podcast.name}`);
    return speeches;
  } catch (error) {
    console.error(`❌ Error fetching podcast ${podcast.name}:`, error);
    return [];
  }
}

export async function fetchAllPodcasts(limit: number = 5): Promise<Speech[]> {
  try {
    console.log('🎧 Fetching all motivational podcasts...');
    
    const allSpeeches: Speech[] = [];
    
    for (const podcast of MOTIVATIONAL_PODCASTS) {
      try {
        const speeches = await fetchPodcastFeed(podcast, limit);
        allSpeeches.push(...speeches);
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ Failed to fetch ${podcast.name}:`, error);
      }
    }
    
    console.log(`✅ Total podcast episodes fetched: ${allSpeeches.length}`);
    return allSpeeches;
  } catch (error) {
    console.error('❌ Error fetching all podcasts:', error);
    return [];
  }
}

export async function fetchPodcastsByCategory(category: string, limit: number = 10): Promise<Speech[]> {
  try {
    console.log(`🎧 Fetching podcasts for category: ${category}`);
    
    const matchingPodcasts = MOTIVATIONAL_PODCASTS.filter(
      p => p.category.toLowerCase() === category.toLowerCase()
    );
    
    if (matchingPodcasts.length === 0) {
      console.log(`⚠️ No podcasts found for category: ${category}`);
      return fetchAllPodcasts(Math.ceil(limit / MOTIVATIONAL_PODCASTS.length));
    }
    
    const allSpeeches: Speech[] = [];
    const perPodcastLimit = Math.ceil(limit / matchingPodcasts.length);
    
    for (const podcast of matchingPodcasts) {
      try {
        const speeches = await fetchPodcastFeed(podcast, perPodcastLimit);
        allSpeeches.push(...speeches);
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ Failed to fetch ${podcast.name}:`, error);
      }
    }
    
    console.log(`✅ Fetched ${allSpeeches.length} episodes for category: ${category}`);
    return allSpeeches.slice(0, limit);
  } catch (error) {
    console.error(`❌ Error fetching podcasts for category ${category}:`, error);
    return [];
  }
}

export async function searchPodcasts(query: string, limit: number = 20): Promise<Speech[]> {
  try {
    console.log(`🔍 Searching podcasts for: ${query}`);
    
    const allSpeeches = await fetchAllPodcasts(10);
    
    const lowercaseQuery = query.toLowerCase();
    const matchingSpeeches = allSpeeches.filter(
      speech =>
        speech.title.toLowerCase().includes(lowercaseQuery) ||
        speech.speaker.toLowerCase().includes(lowercaseQuery) ||
        speech.description.toLowerCase().includes(lowercaseQuery) ||
        (speech.tags && speech.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
    );
    
    console.log(`✅ Found ${matchingSpeeches.length} matching episodes`);
    return matchingSpeeches.slice(0, limit);
  } catch (error) {
    console.error(`❌ Error searching podcasts:`, error);
    return [];
  }
}

export async function getTrendingPodcasts(limit: number = 20): Promise<Speech[]> {
  try {
    console.log('📈 Fetching trending podcasts...');
    
    const speeches = await fetchAllPodcasts(Math.ceil(limit / MOTIVATIONAL_PODCASTS.length));
    
    const shuffled = speeches.sort(() => Math.random() - 0.5);
    
    console.log(`✅ Returning ${Math.min(shuffled.length, limit)} trending episodes`);
    return shuffled.slice(0, limit);
  } catch (error) {
    console.error('❌ Error fetching trending podcasts:', error);
    return [];
  }
}
