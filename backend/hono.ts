import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import OpenAI from "openai";

const app = new Hono();

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
  return c.json({ status: "ok", message: "API is running", timestamp: new Date().toISOString() });
});

app.get("/api", (c) => {
  console.log("[Hono] /api endpoint hit");
  return c.json({ status: "ok", message: "tRPC API is running", timestamp: new Date().toISOString() });
});

app.get("/health", (c) => {
  console.log("[Hono] Health check (no /api prefix)");
  return c.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    }
  });
});

app.get("/api/health", (c) => {
  console.log("[Hono] Health check (with /api prefix)");
  return c.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    }
  });
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
