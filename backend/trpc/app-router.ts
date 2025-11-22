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

console.log('[tRPC] App router initialized with routes:', Object.keys(appRouter._def.procedures));
console.log('[tRPC] Podcast routes:', Object.keys((appRouter._def.procedures as any).podcast?._def?.procedures || {}));

export type AppRouter = typeof appRouter;
