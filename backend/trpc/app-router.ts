import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { chatRouter } from "./routes/chat/route";
import { ttsRouter } from "./routes/tts/route";
import { fetchContentProcedure, searchContentProcedure, trendingContentProcedure } from "./routes/content/youtube-fetch";
import { runDailyBatchProcedure, getCachedVideosProcedure, getBatchStatusProcedure } from "./routes/content/daily-batch";
import { podcastRouter } from "./routes/podcast/rss-proxy";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  chat: chatRouter,
  tts: ttsRouter,
  content: createTRPCRouter({
    fetch: fetchContentProcedure,
    search: searchContentProcedure,
    trending: trendingContentProcedure,
    runDailyBatch: runDailyBatchProcedure,
    getCachedVideos: getCachedVideosProcedure,
    getBatchStatus: getBatchStatusProcedure,
  }),
  podcast: podcastRouter,
});

console.log('[tRPC] App router initialized');
console.log('[tRPC] Available routes:', Object.keys(appRouter._def.procedures));

try {
  const podcastProcedures = (appRouter._def.procedures as any).podcast;
  if (podcastProcedures && podcastProcedures._def) {
    console.log('[tRPC] Podcast sub-routes:', Object.keys(podcastProcedures._def.procedures || {}));
  } else {
    console.log('[tRPC] Podcast procedures:', podcastProcedures);
  }
} catch (error) {
  console.error('[tRPC] Error inspecting podcast routes:', error);
}

export type AppRouter = typeof appRouter;
