import { Hono } from "hono";
import type { Context, Next } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import OpenAI from "openai";

console.log('[Backend] Hono server initializing with content.trending support');

const app = new Hono();

app.options("*", (c: Context) => {
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

app.use("*", async (c: Context, next: Next) => {
  console.log("[Hono] Incoming request:", c.req.method, c.req.url);
  console.log("[Hono] Request path:", c.req.path);
  console.log("[Hono] Request headers:", Object.fromEntries(c.req.raw.headers.entries()));
  await next();
  console.log("[Hono] Response status:", c.res.status);
  console.log("[Hono] Response content-type:", c.res.headers.get('content-type'));
});

app.get("/", (c: Context) => {
  console.log("[Hono] Root endpoint hit");
  return c.json({ ok: true, status: "ok", message: "API is running", timestamp: new Date().toISOString() }, 200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  });
});

app.get("/api", (c: Context) => {
  console.log("[Hono] /api endpoint hit");
  return c.json({ ok: true, status: "ok", message: "tRPC API is running", timestamp: new Date().toISOString() }, 200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  });
});

app.get("/health", (c: Context) => {
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

app.get("/api/health", (c: Context) => {
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

app.all('/api/cron/youtube-batch', async (c: Context) => {
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
  } catch (error: unknown) {
    console.error('❌ Cron job failed:', error);
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

const handleTTS = async (c: Context) => {
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

const handleChat = async (c: Context) => {
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

const handleSTT = async (c: Context) => {
  try {
    console.log("[Hono] STT request received");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[Hono] OpenAI API key not configured");
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    const formData = await c.req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof File)) {
      return c.json({ error: "Audio file is required" }, 400);
    }

    console.log("[Hono] STT audio file received:", audioFile.name, "size:", audioFile.size);

    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile, audioFile.name || 'recording.wav');
    openaiFormData.append('model', 'gpt-4o-mini-transcribe');
    openaiFormData.append('language', 'en');

    console.log("[Hono] Sending to OpenAI Whisper API...");
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: openaiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Hono] OpenAI Whisper error:", response.status, errorText);
      return c.json({ error: "Transcription failed", details: errorText.substring(0, 200) }, 500);
    }

    const data = await response.json();
    console.log("[Hono] STT transcription received, text length:", data.text?.length);

    return c.json({ text: data.text || '' });
  } catch (error) {
    console.error("[Hono] STT error:", error);
    return c.json({
      error: "STT transcription failed",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
};

app.post("/api/stt", handleSTT);
app.post("/stt", handleSTT);

const handleImageGenerate = async (c: Context) => {
  try {
    console.log("[Hono] Image generation request received");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[Hono] OpenAI API key not configured");
      return c.json({ error: "OpenAI API key not configured" }, 500);
    }

    const body = await c.req.json();
    const { prompt, size = '1024x1024' } = body;

    if (!prompt || typeof prompt !== 'string') {
      return c.json({ error: "Prompt is required" }, 400);
    }

    console.log("[Hono] Generating image with DALL-E...");
    console.log("[Hono] Prompt length:", prompt.length);
    console.log("[Hono] Size:", size);

    const openai = new OpenAI({ apiKey });

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: size as any,
      response_format: "url",
    });

    const imageData = imageResponse.data;
    const imageUrl = Array.isArray(imageData) ? imageData[0]?.url : undefined;
    if (!imageUrl) {
      throw new Error("No image URL returned from OpenAI");
    }

    console.log("[Hono] Image generated successfully");

    return c.json({ imageUrl });
  } catch (error) {
    console.error("[Hono] Image generation error:", error);
    return c.json({
      error: "Image generation failed",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
};

app.post("/api/image-generate", handleImageGenerate);
app.post("/image-generate", handleImageGenerate);

import { YOUTUBE_API_KEYS, getNextYouTubeKey, markYouTubeKeyIssue, isQuotaError } from './lib/youtube-keys';

const REQUEST_CACHE = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 60 * 12;

const ADMIN_DATA_STORE: Record<string, any> = {
  flyers: [],
  videos: [],
  banners: [],
  updatedAt: null,
  _loaded: false,
};

import { supabaseBackend } from './lib/supabase';

const ADMIN_SUPABASE_TABLE = 'admin_content';

async function loadAdminDataFromSupabase(): Promise<void> {
  try {
    console.log('[Admin] Loading admin data from Supabase...');
    const { data, error } = await supabaseBackend
      .from(ADMIN_SUPABASE_TABLE)
      .select('*')
      .eq('id', 'global_admin_data')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[Admin] No admin data row found in Supabase, will create on first write');
      } else {
        console.warn('[Admin] Supabase load error:', error.message);
      }
      return;
    }

    if (data) {
      ADMIN_DATA_STORE.flyers = Array.isArray(data.flyers) ? data.flyers : [];
      ADMIN_DATA_STORE.videos = Array.isArray(data.videos) ? data.videos : [];
      ADMIN_DATA_STORE.banners = Array.isArray(data.banners) ? data.banners : [];
      ADMIN_DATA_STORE.updatedAt = data.updated_at || null;
      ADMIN_DATA_STORE._loaded = true;
      console.log('[Admin] Loaded admin data from Supabase:', {
        flyers: ADMIN_DATA_STORE.flyers.length,
        videos: ADMIN_DATA_STORE.videos.length,
        banners: ADMIN_DATA_STORE.banners.length,
      });
    }
  } catch (err) {
    console.error('[Admin] Failed to load from Supabase:', err);
  }
}

async function saveAdminDataToSupabase(): Promise<void> {
  try {
    const now = new Date().toISOString();
    ADMIN_DATA_STORE.updatedAt = now;

    const payload = {
      id: 'global_admin_data',
      flyers: ADMIN_DATA_STORE.flyers,
      videos: ADMIN_DATA_STORE.videos,
      banners: ADMIN_DATA_STORE.banners,
      updated_at: now,
    };

    const { error } = await supabaseBackend
      .from(ADMIN_SUPABASE_TABLE)
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Admin] Supabase save error:', error.message);
      console.log('[Admin] Data is still in memory, will retry on next write');
    } else {
      console.log('[Admin] Admin data persisted to Supabase at', now);
    }
  } catch (err) {
    console.error('[Admin] Failed to save to Supabase:', err);
  }
}

async function ensureAdminDataLoaded(): Promise<void> {
  if (!ADMIN_DATA_STORE._loaded) {
    await loadAdminDataFromSupabase();
    ADMIN_DATA_STORE._loaded = true;
  }
}

/**
 * Each app category maps to exactly 3 YouTube search queries.
 * This ensures every category consumes the same amount of YouTube API quota
 * (3 search calls + 3 video-details calls per category page visit).
 * Queries are tailored to each category's topic so results are always relevant.
 */
const CATEGORY_SEARCH_QUERIES: Record<string, string[]> = {
  motivation: [
    'motivational speech 2024',
    'david goggins motivation',
    'best motivational speech',
  ],
  success: [
    'success mindset speech',
    'entrepreneur motivation',
    'business success speech',
  ],
  mindset: [
    'growth mindset speech',
    'mental toughness',
    'champion mindset',
  ],
  fitness: [
    'fitness motivation speech',
    'workout motivation',
    'gym training motivation',
  ],
  study: [
    'study motivation',
    'focus and concentration',
    'student motivation',
  ],
  'christian motivation': [
    'pastor motivational sermon preaching',
    'christian pastor sermon encouragement',
    'church pastor preaching motivational message',
  ],
  'athlete pump up': [
    'athlete pump up motivation',
    'pregame motivation speech',
    'sports motivation beast mode',
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

async function fetchWithTimeout(url: string, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchYouTubeVideosWithKey(
  query: string,
  maxResults: number,
  apiKey: string,
): Promise<{ videos: any[]; sourceKey: string }> {
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('maxResults', maxResults.toString());
  searchUrl.searchParams.set('order', 'relevance');
  searchUrl.searchParams.set('videoDuration', 'medium');
  searchUrl.searchParams.set('videoEmbeddable', 'true');
  searchUrl.searchParams.set('videoSyndicated', 'true');
  searchUrl.searchParams.set('key', apiKey);

  console.log('[YouTube] Fetching search results...');
  console.log('[YouTube] API Key used:', apiKey.substring(0, 10) + '...');

  const searchResponse = await fetchWithTimeout(searchUrl.toString());
  const searchErrorText = await searchResponse.text();

  if (!searchResponse.ok) {
    console.error('[YouTube] Search API error:', searchResponse.status, searchErrorText);
    if (isQuotaError(searchResponse.status, searchErrorText)) {
      markYouTubeKeyIssue(apiKey, true);
    } else {
      markYouTubeKeyIssue(apiKey, false);
    }

    let errorDetails = searchErrorText;
    try {
      const errorJson = JSON.parse(searchErrorText);
      if (errorJson.error) {
        errorDetails = errorJson.error.message || errorJson.error;
        console.error('[YouTube] Error details:', errorJson.error);

        if (searchResponse.status === 403) {
          if (errorDetails.toLowerCase().includes('quota') || errorDetails.toLowerCase().includes('exceeded')) {
            errorDetails = 'YouTube API quota exceeded. Please check your quota at https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas';
          } else if (errorDetails.toLowerCase().includes('api key')) {
            errorDetails = `YouTube API key is invalid or restricted. Please check:
1. API key is correct in environment variables
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

  const searchData = JSON.parse(searchErrorText);
  const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

  if (!videoIds) {
    return { videos: [], sourceKey: apiKey };
  }

  const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  detailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics,status');
  detailsUrl.searchParams.set('id', videoIds);
  detailsUrl.searchParams.set('key', apiKey);

  console.log('[YouTube] Fetching video details...');
  const detailsResponse = await fetchWithTimeout(detailsUrl.toString());
  if (!detailsResponse.ok) {
    const errorText = await detailsResponse.text();
    console.error('[YouTube] Videos API error:', detailsResponse.status, errorText);
    throw new Error(`YouTube API error: ${detailsResponse.status}`);
  }

  const detailsData = await detailsResponse.json();

  const videos = detailsData.items
    .filter((item: any) => {
      const isEmbeddable = item.status?.embeddable !== false;
      const isPublic = item.status?.privacyStatus === 'public';
      const hasValidDuration = parseDuration(item.contentDetails.duration) > 0;

      if (!isEmbeddable) {
        console.log(`[YouTube] ⏭️ Skipping non-embeddable: ${item.snippet.title}`);
      }
      if (!isPublic) {
        console.log(`[YouTube] ⏭️ Skipping non-public: ${item.snippet.title}`);
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

  console.log(`[YouTube] ✅ Key ${apiKey.substring(0, 10)}... fetched ${videos.length} embeddable videos (from ${detailsData.items.length} total)`);

  return { videos, sourceKey: apiKey };
}

async function fetchYouTubeVideos(query: string, maxResults: number = 10, preferKeyIndex?: number) {
  const cacheKey = `${query}-${maxResults}`;
  const cached = REQUEST_CACHE.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[YouTube] ✅ Using cached data for: "${query}"`);
    return cached.data;
  }

  if (YOUTUBE_API_KEYS.length === 0) {
    console.error('[YouTube] ❌ API key not configured!');
    console.error('[YouTube] Please set YOUTUBE_API_KEY or EXPO_PUBLIC_YOUTUBE_API_KEY in environment variables');
    console.error('[YouTube] Get your API key from: https://console.cloud.google.com/apis/credentials');

    if (cached) {
      console.warn('[YouTube] ⚠️ Using expired cache as fallback');
      return cached.data;
    }

    throw new Error('YouTube API key not configured. Please set YOUTUBE_API_KEY or EXPO_PUBLIC_YOUTUBE_API_KEY in environment variables.');
  }

  let startIndex = preferKeyIndex ?? 0;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < YOUTUBE_API_KEYS.length; attempt++) {
    const key = getNextYouTubeKey(startIndex);
    if (!key) break;

    try {
      const { videos } = await fetchYouTubeVideosWithKey(query, maxResults, key);

      REQUEST_CACHE.set(cacheKey, { data: videos, timestamp: Date.now() });
      if (REQUEST_CACHE.size > 100) {
        const oldestKey = Array.from(REQUEST_CACHE.keys())[0];
        REQUEST_CACHE.delete(oldestKey);
      }

      if (videos.length === 0) {
        console.warn(`[YouTube] ⚠️ All videos were filtered out - none were embeddable`);
      }
      return videos;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[YouTube] ⚠️ Attempt ${attempt + 1} failed with key ${key.substring(0, 10)}...: ${lastError.message}`);
      startIndex = (YOUTUBE_API_KEYS.indexOf(key) + 1) % YOUTUBE_API_KEYS.length;
    }
  }

  console.error('[YouTube] ❌ All API keys exhausted or failed');

  if (cached) {
    console.warn('[YouTube] ⚠️ Using expired cache as fallback due to API error');
    return cached.data;
  }

  throw lastError || new Error('YouTube API keys failed');
}

const handleYouTubeCategory = async (c: Context) => {
  try {
    console.log('[YouTube] Category request received');
    const body = await c.req.json();
    const { category, limit = 10 } = body;

    if (!category) {
      return c.json({ error: 'Category is required' }, 400);
    }

    const categoryKey = category.toLowerCase();
    const searchQueries = CATEGORY_SEARCH_QUERIES[categoryKey] || CATEGORY_SEARCH_QUERIES.motivation;

    // Always run ALL category queries — key rotation happens inside fetchYouTubeVideos.
    const queriesToRun = searchQueries;

    const candidateTarget = Math.max(limit * 2, limit + 20);
    const perQueryLimit = Math.min(
      50,
      Math.max(8, Math.ceil(candidateTarget / queriesToRun.length))
    );

    console.log(`[YouTube] Fetching category: ${category}, queries: ${queriesToRun.length}, per-query limit: ${perQueryLimit}, keys: ${YOUTUBE_API_KEYS.length}`);

    const results = await Promise.allSettled(
      queriesToRun.map((q, idx) => fetchYouTubeVideos(q, perQueryLimit, idx))
    );

    const seen = new Set<string>();
    const videos: any[] = [];
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        result.value.forEach((video: any) => {
          if (!seen.has(video.id)) {
            seen.add(video.id);
            videos.push(video);
          }
        });
      } else {
        console.warn(`[YouTube] Query ${queriesToRun[idx]} failed:`, result.reason);
      }
    });

    console.log(`[YouTube] Category ${category} returning ${videos.length} unique videos`);

    return c.json({
      videos: videos.slice(0, limit),
      category,
      queries: queriesToRun,
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

const handleYouTubeSearch = async (c: Context) => {
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
      keysAvailable: YOUTUBE_API_KEYS.length,
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

const handleYouTubeTrending = async (c: Context) => {
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
      keysAvailable: YOUTUBE_API_KEYS.length,
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

const handleGetAdminData = async (c: Context) => {
  console.log('[Admin] GET admin data');
  await ensureAdminDataLoaded();
  return c.json({
    flyers: ADMIN_DATA_STORE.flyers,
    videos: ADMIN_DATA_STORE.videos,
    banners: ADMIN_DATA_STORE.banners,
    updatedAt: ADMIN_DATA_STORE.updatedAt || null,
  });
};

app.get('/api/admin/data', handleGetAdminData);
app.get('/admin/data', handleGetAdminData);

const handlePostAdminData = async (c: Context) => {
  try {
    await ensureAdminDataLoaded();
    const body = await c.req.json();
    const { type, action, data } = body;
    console.log(`[Admin] POST admin data: type=${type}, action=${action}`);

    if (type === 'flyers') {
      if (action === 'add') {
        ADMIN_DATA_STORE.flyers.push(data);
      } else if (action === 'remove') {
        ADMIN_DATA_STORE.flyers = ADMIN_DATA_STORE.flyers.filter((f: any) => f.id !== data.id);
      } else if (action === 'set') {
        ADMIN_DATA_STORE.flyers = data;
      }
    } else if (type === 'videos') {
      if (action === 'add') {
        ADMIN_DATA_STORE.videos.push(data);
      } else if (action === 'remove') {
        ADMIN_DATA_STORE.videos = ADMIN_DATA_STORE.videos.filter((v: any) => v.id !== data.id);
      } else if (action === 'set') {
        ADMIN_DATA_STORE.videos = data;
      }
    } else if (type === 'banners') {
      if (action === 'update') {
        const idx = ADMIN_DATA_STORE.banners.findIndex((b: any) => b.categoryId === data.categoryId);
        if (idx >= 0) {
          ADMIN_DATA_STORE.banners[idx] = data;
        } else {
          ADMIN_DATA_STORE.banners.push(data);
        }
      } else if (action === 'set') {
        ADMIN_DATA_STORE.banners = data;
      }
    }

    await saveAdminDataToSupabase();
    console.log('[Admin] Data updated and persisted successfully');
    return c.json({
      ok: true,
      updatedAt: ADMIN_DATA_STORE.updatedAt,
      flyers: ADMIN_DATA_STORE.flyers,
      videos: ADMIN_DATA_STORE.videos,
      banners: ADMIN_DATA_STORE.banners,
    });
  } catch (error) {
    console.error('[Admin] Error updating data:', error);
    return c.json({ error: 'Failed to update admin data' }, 500);
  }
};

app.post('/api/admin/data', handlePostAdminData);
app.post('/admin/data', handlePostAdminData);

const handleGetFlyers = async (c: Context) => {
  try {
    console.log('[Flyers] GET flyers from Supabase');
    await ensureAdminDataLoaded();

    const { data: supabaseFlyers, error } = await supabaseBackend
      .from('flyers')
      .select('*')
      .order('created_at', { ascending: false });

    let flyersFromTable: any[] = [];
    if (error) {
      console.warn('[Flyers] Supabase flyers table error:', error.message);
    } else if (supabaseFlyers && supabaseFlyers.length > 0) {
      flyersFromTable = supabaseFlyers.map((f: any) => ({
        id: f.id || `sb-flyer-${f.created_at}`,
        title: f.title || '',
        quote: f.quote || '',
        imageUrl: f.image_url || f.imageUrl || '',
        accent: f.accent || '#FF8A00',
      }));
      console.log(`[Flyers] Found ${flyersFromTable.length} flyers in Supabase flyers table`);
    }

    const adminFlyers = Array.isArray(ADMIN_DATA_STORE.flyers) ? ADMIN_DATA_STORE.flyers : [];

    const allFlyers = [...flyersFromTable, ...adminFlyers];
    const seen = new Set<string>();
    const uniqueFlyers = allFlyers.filter(f => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });

    console.log(`[Flyers] Returning ${uniqueFlyers.length} total flyers (${flyersFromTable.length} from table, ${adminFlyers.length} from admin)`);

    return c.json({
      flyers: uniqueFlyers,
      source: 'supabase',
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Flyers] Error fetching flyers:', error);
    await ensureAdminDataLoaded();
    return c.json({
      flyers: ADMIN_DATA_STORE.flyers || [],
      source: 'admin_fallback',
      fetchedAt: new Date().toISOString(),
    });
  }
};

app.get('/api/flyers', handleGetFlyers);
app.get('/flyers', handleGetFlyers);

app.post('/api/youtube/category', handleYouTubeCategory);
app.post('/youtube/category', handleYouTubeCategory);
app.post('/api/youtube/search', handleYouTubeSearch);
app.post('/youtube/search', handleYouTubeSearch);
app.post('/api/youtube/trending', handleYouTubeTrending);
app.post('/youtube/trending', handleYouTubeTrending);

app.all("/trpc/*", async (c: Context) => {
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

app.all("/api/trpc/*", async (c: Context) => {
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

app.notFound((c: Context) => {
  console.log("[Hono] 404 Not Found:", c.req.method, c.req.url);
  return c.json({ error: "Not Found", path: c.req.path, method: c.req.method }, 404);
});

app.onError((err: Error, c: Context) => {
  console.error("[Hono] Unhandled error:", err);
  return c.json({
    error: "Internal Server Error",
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  }, 500);
});

export default app;
