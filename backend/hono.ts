import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors());

app.use("*", async (c, next) => {
  console.log("[Hono] Incoming request:", c.req.method, c.req.url);
  await next();
  console.log("[Hono] Response status:", c.res.status);
});

app.all("/api/trpc/*", async (c) => {
  console.log("[Hono] tRPC request:", c.req.method, c.req.url);
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

app.get("/", (c) => {
  console.log("[Hono] Root endpoint hit");
  return c.json({ status: "ok", message: "API is running", timestamp: new Date().toISOString() });
});

app.get("/api", (c) => {
  console.log("[Hono] /api endpoint hit");
  return c.json({ status: "ok", message: "tRPC API is running", timestamp: new Date().toISOString() });
});

app.get("/api/health", (c) => {
  console.log("[Hono] Health check");
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

export default app;
