import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { chatRouter } from "./routes/chat/route";
import { ttsRouter } from "./routes/tts/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  chat: chatRouter,
  tts: ttsRouter,
});

export type AppRouter = typeof appRouter;
