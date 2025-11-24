import { handle } from "hono/vercel";
import app from "../backend/hono";

export const config = {
  runtime: 'edge',
};

console.log('[Vercel] API handler loaded - v2.4 - Podcast Router Debug');
console.log('[Vercel] Environment check:', {
  hasOpenAI: !!process.env.OPENAI_API_KEY,
  hasSupabase: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
});
console.log('[Vercel] App imported successfully');

try {
  const { appRouter } = require('../backend/trpc/app-router');
  console.log('[Vercel] Router check - procedures:', Object.keys(appRouter._def.procedures));
  const podcastRoute = (appRouter._def.procedures as any).podcast;
  if (podcastRoute?._def?.procedures) {
    console.log('[Vercel] Podcast procedures found:', Object.keys(podcastRoute._def.procedures));
  } else {
    console.log('[Vercel] Podcast route structure:', typeof podcastRoute);
  }
} catch (error: any) {
  console.error('[Vercel] Router inspection failed:', error.message);
}

export default handle(app);
