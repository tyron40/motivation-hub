import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { chatRouter } from "./routes/chat/route";
import { ttsRouter } from "./routes/tts/route";
import { fetchContentProcedure, searchContentProcedure, trendingContentProcedure } from "./routes/content/youtube-fetch";
import { runDailyBatchProcedure, getCachedVideosProcedure, getBatchStatusProcedure } from "./routes/content/daily-batch";

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
});

export type AppRouter = typeof appRouter;
