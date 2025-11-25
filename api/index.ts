import { handle } from "hono/vercel";
import app from "../backend/hono";

export const config = {
  runtime: 'edge',
};

console.log('[Vercel] API handler loaded');
console.log('[Vercel] Environment check:', {
  hasOpenAI: !!process.env.OPENAI_API_KEY,
  hasSupabase: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
});

export default handle(app);
