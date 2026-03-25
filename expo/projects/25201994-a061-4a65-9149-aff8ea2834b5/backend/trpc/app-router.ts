import { router } from './init';
import { hiProcedure } from './routes/example/hi/route';
import { chatProcedures } from './routes/chat/route';
import { ttsProcedure } from './routes/tts/route';

export const appRouter = router({
  example: router({
    hi: hiProcedure,
  }),
  chat: router(chatProcedures),
  tts: ttsProcedure,
});

export type AppRouter = typeof appRouter;
