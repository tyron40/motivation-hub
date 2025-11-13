import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import OpenAI from "openai";

console.log('[Backend] Hono server initializing with content.trending support');

const app = new Hono();

app.options("*", (c) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', '*');
  c.header('Access-Control-Max-Age', '600');
  return c.body(null, 204);
});

app.use("*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['*'],
  exposeHeaders: ['*'],
  maxAge: 600,
  credentials: false,
}));

app.use("*", async (c, next) => {
  console.log("[Hono] Incoming request:", c.req.method, c.req.url);
  console.log("[Hono] Request path:", c.req.path);
  console.log("[Hono] Request headers:", Object.fromEntries(c.req.raw.headers.entries()));
  await next();
  console.log("[Hono] Response status:", c.res.status);
  console.log("[Hono] Response content-type:", c.res.headers.get('content-type'));
});

app.get("/", (c) => {
  console.log("[Hono] Root endpoint hit");
  return c.json({ ok: true, status: "ok", message: "API is running", timestamp: new Date().toISOString() }, 200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  });
});

app.get("/api", (c) => {
  console.log("[Hono] /api endpoint hit");
  return c.json({ ok: true, status: "ok", message: "tRPC API is running", timestamp: new Date().toISOString() }, 200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  });
});

app.get("/health", (c) => {
  console.log("[Hono] Health check (no /api prefix)");
  return c.json({ 
    ok: true,
    status: "healthy", 
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasYouTubeKey: !!(process.env.YOUTUBE_API_KEY || process.env.EXPO_PUBLIC_YOUTUBE_API_KEY),
    }
  }, 200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Cache-Control': 'no-cache',
  });
});

app.get("/api/health", (c) => {
  console.log("[Hono] Health check (with /api prefix)");
  return c.json({ 
    ok: true,
    status: "healthy", 
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasYouTubeKey: !!(process.env.YOUTUBE_API_KEY || process.env.EXPO_PUBLIC_YOUTUBE_API_KEY),
    }
  }, 200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Cache-Control': 'no-cache',
  });
});

app.all('/api/cron/youtube-batch', async (c) => {
  try {
    console.log('🕐 Cron job triggered: Running daily YouTube batch fetch');
    
    const authHeader = c.req.header('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Unauthorized cron request');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const fakeRequest = new Request('https://example.com/api/trpc/content.runDailyBatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videosPerQuery: 5,
        forceRefresh: false,
      }),
    });
    
    const context = await createContext({ 
      req: fakeRequest,
      resHeaders: new Headers(),
      info: {} as any,
    });
    const caller = appRouter.createCaller(context);
    
    const result = await caller.content.runDailyBatch({
      videosPerQuery: 5,
      forceRefresh: false,
    });
    
    console.log('✅ Daily batch completed:', result);
    return c.json(result);
  } catch (error: any) {
    console.error('❌ Cron job failed:', error);
    return c.json({ error: error.message }, 500);
  }
});

const handleTTS = async (c: any) => {
  try {
    console.log("[Hono] TTS request received");
    console.log("[Hono] Request URL:", c.req.url);
    console.log("[Hono] Request path:", c.req.path);
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[Hono] OpenAI API key not configured");
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    const body = await c.req.json();
    const { text, voice = 'alloy' } = body;

    if (!text || typeof text !== 'string') {
      return c.json({ error: "Text is required" }, 400);
    }

    console.log("[Hono] Generating TTS with OpenAI...");
    console.log("[Hono] Text length:", text.length);
    console.log("[Hono] Voice:", voice);

    const openai = new OpenAI({ apiKey });

    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice as any,
      input: text,
    });

    const arrayBuffer = await mp3Response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    console.log("[Hono] TTS generated successfully, size:", base64Data.length);

    return c.json({
      audio: {
        base64Data,
        mimeType: 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error("[Hono] TTS error:", error);
    return c.json({ 
      error: "TTS generation failed", 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
};

app.post("/api/tts", handleTTS);
app.post("/tts", handleTTS);

const handleChat = async (c: any) => {
  try {
    console.log("[Hono] Chat request received");
    console.log("[Hono] Request URL:", c.req.url);
    console.log("[Hono] Request path:", c.req.path);
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[Hono] OpenAI API key not configured");
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    const body = await c.req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: "Messages array is required" }, 400);
    }

    console.log("[Hono] Sending chat request to OpenAI...");
    console.log("[Hono] Messages count:", messages.length);

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages as any,
    });

    const message = completion.choices[0]?.message?.content;

    if (!message) {
      throw new Error("No response from OpenAI");
    }

    console.log("[Hono] Chat response received, length:", message.length);

    return c.json({ message });
  } catch (error) {
    console.error("[Hono] Chat error:", error);
    return c.json({ 
      error: "Chat request failed", 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
};

app.post("/api/chat", handleChat);
app.post("/chat", handleChat);

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

const REQUEST_CACHE = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60 * 12;

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

async function fetchYouTubeVideos(query: string, maxResults: number = 10) {
  const cacheKey = `${query}-${maxResults}`;
  const cached = REQUEST_CACHE.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[YouTube] ✅ Using cached data for: "${query}"`);
    return cached.data;
  }

  if (!YOUTUBE_API_KEY) {
    console.error('[YouTube] ❌ API key not configured!');
    console.error('[YouTube] Please set YOUTUBE_API_KEY in Vercel environment variables');
    console.error('[YouTube] Get your API key from: https://console.cloud.google.com/apis/credentials');
    
    if (cached) {
      console.warn('[YouTube] ⚠️ Using expired cache as fallback');
      return cached.data;
    }
    
    throw new Error('YouTube API key not configured. Please set YOUTUBE_API_KEY in Vercel environment variables.');
  }

  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', maxResults.toString());
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('videoDuration', 'medium');
    searchUrl.searchParams.set('key', YOUTUBE_API_KEY);

    console.log('[YouTube] Fetching search results...');
    console.log('[YouTube] API Key present:', YOUTUBE_API_KEY ? `Yes (${YOUTUBE_API_KEY.substring(0, 10)}...)` : 'No');
    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('[YouTube] Search API error:', searchResponse.status, errorText);
      
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorDetails = errorJson.error.message || errorJson.error;
          console.error('[YouTube] Error details:', errorJson.error);
          
          if (searchResponse.status === 403) {
            if (errorDetails.includes('quotaExceeded') || errorDetails.includes('quota')) {
              errorDetails = 'YouTube API quota exceeded. Please check your quota at https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas';
            } else if (errorDetails.includes('API key')) {
              errorDetails = `YouTube API key is invalid or restricted. Please check:
1. API key is correct in Vercel environment variables
2. YouTube Data API v3 is enabled in Google Cloud Console
3. API key restrictions (if any) allow requests from your server`;
            } else {
              errorDetails = `YouTube API forbidden (403). Possible reasons:
1. Invalid API key
2. YouTube Data API v3 not enabled
3. API key has restrictions
4. Daily quota exceeded

Details: ${errorDetails}`;
            }
          }
        }
      } catch {
        // Not JSON, use raw error
      }
      
      throw new Error(`YouTube API error: ${searchResponse.status} - ${errorDetails}`);
    }

    const searchData = await searchResponse.json();
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

    if (!videoIds) {
      return [];
    }

    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics,status');
    detailsUrl.searchParams.set('id', videoIds);
    detailsUrl.searchParams.set('key', YOUTUBE_API_KEY);

    console.log('[YouTube] Fetching video details...');
    const detailsResponse = await fetch(detailsUrl.toString());
    if (!detailsResponse.ok) {
      const errorText = await detailsResponse.text();
      console.error('[YouTube] Videos API error:', detailsResponse.status, errorText);
      throw new Error(`YouTube API error: ${detailsResponse.status}`);
    }

    const detailsData = await detailsResponse.json();

    const videos = detailsData.items
      .filter((item: any) => {
        const embeddable = item.status?.embeddable !== false;
        const isPublic = item.status?.privacyStatus === 'public';
        if (!embeddable || !isPublic) {
          console.log(`[YouTube] ⚠️ Filtering out non-embeddable video: ${item.snippet.title}`);
        }
        return embeddable && isPublic;
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
        embeddable: item.status?.embeddable !== false,
      }));

    REQUEST_CACHE.set(cacheKey, { data: videos, timestamp: Date.now() });
    
    if (REQUEST_CACHE.size > 100) {
      const oldestKey = Array.from(REQUEST_CACHE.keys())[0];
      REQUEST_CACHE.delete(oldestKey);
    }

    console.log(`[YouTube] ✅ Successfully fetched and cached ${videos.length} videos`);
    return videos;
  } catch (error) {
    console.error('[YouTube] Error fetching videos:', error);
    
    if (cached) {
      console.warn('[YouTube] ⚠️ Using expired cache as fallback due to API error');
      return cached.data;
    }
    
    throw error;
  }
}

const handleYouTubeCategory = async (c: any) => {
  try {
    console.log('[YouTube] Category request received');
    const body = await c.req.json();
    const { category, limit = 10 } = body;

    if (!category) {
      return c.json({ error: 'Category is required' }, 400);
    }

    const categoryKey = category.toLowerCase();
    const searchQueries = CATEGORY_SEARCH_QUERIES[categoryKey] || CATEGORY_SEARCH_QUERIES.motivation;
    const queryIndex = new Date().getDate() % searchQueries.length;
    const todayQuery = searchQueries[queryIndex];

    console.log(`[YouTube] Fetching category: ${category}, query: "${todayQuery}"`);
    const videos = await fetchYouTubeVideos(todayQuery, limit);

    return c.json({
      videos,
      category,
      query: todayQuery,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[YouTube] Category error:', error);
    return c.json({
      error: 'Failed to fetch YouTube content',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
};

const handleYouTubeSearch = async (c: any) => {
  try {
    console.log('[YouTube] Search request received');
    const body = await c.req.json();
    const { query, limit = 20 } = body;

    if (!query) {
      return c.json({ error: 'Query is required' }, 400);
    }

    console.log(`[YouTube] Searching for: "${query}"`);
    const videos = await fetchYouTubeVideos(query, limit);

    return c.json({
      videos,
      query,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[YouTube] Search error:', error);
    return c.json({
      error: 'Failed to search YouTube',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
};

const handleYouTubeTrending = async (c: any) => {
  try {
    console.log('[YouTube] Trending request received');
    const body = await c.req.json();
    const { limit = 20 } = body;

    const trendingQueries = [
      'motivational speech 2024',
      'best motivational speech',
      'powerful motivation',
    ];

    const queryIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % trendingQueries.length;
    const query = trendingQueries[queryIndex];

    console.log(`[YouTube] Fetching trending with query: "${query}"`);
    const videos = await fetchYouTubeVideos(query, limit);

    return c.json({
      videos,
      query,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[YouTube] Trending error:', error);
    return c.json({
      error: 'Failed to fetch trending content',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
};

app.post('/api/youtube/category', handleYouTubeCategory);
app.post('/youtube/category', handleYouTubeCategory);
app.post('/api/youtube/search', handleYouTubeSearch);
app.post('/youtube/search', handleYouTubeSearch);
app.post('/api/youtube/trending', handleYouTubeTrending);
app.post('/youtube/trending', handleYouTubeTrending);

app.all("/trpc/*", async (c) => {
  console.log("[Hono] tRPC request:", c.req.method, c.req.url);
  try {
    const response = await fetchRequestHandler({
      endpoint: "/trpc",
      req: c.req.raw,
      router: appRouter,
      createContext,
    });
    console.log("[Hono] tRPC response status:", response.status);
    return response;
  } catch (error) {
    console.error("[Hono] tRPC error:", error);
    return c.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.all("/api/trpc/*", async (c) => {
  console.log("[Hono] tRPC request (with /api prefix):", c.req.method, c.req.url);
  try {
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: c.req.raw,
      router: appRouter,
      createContext,
    });
    console.log("[Hono] tRPC response status:", response.status);
    return response;
  } catch (error) {
    console.error("[Hono] tRPC error:", error);
    return c.json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.notFound((c) => {
  console.log("[Hono] 404 Not Found:", c.req.method, c.req.url);
  return c.json({ error: "Not Found", path: c.req.path, method: c.req.method }, 404);
});

app.onError((err, c) => {
  console.error("[Hono] Unhandled error:", err);
  return c.json({ 
    error: "Internal Server Error", 
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
  }, 500);
});

export default app;
