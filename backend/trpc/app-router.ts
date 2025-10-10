import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { chatRouter } from "./routes/chat/route";
import { ttsRouter } from "./routes/tts/route";
import { fetchContentProcedure, searchContentProcedure, trendingContentProcedure } from "./routes/content/youtube-fetch";

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
  }),
});

export type AppRouter = typeof appRouter;
