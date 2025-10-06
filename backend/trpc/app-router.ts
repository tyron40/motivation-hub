import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { chatRoute } from "./routes/chat/route";
import { ttsRoute } from "./routes/tts/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  chat: chatRoute,
  tts: ttsRoute,
});

export type AppRouter = typeof appRouter;
