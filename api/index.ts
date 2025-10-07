import { handle } from "hono/vercel";
import app from "../backend/hono";

export const config = {
  runtime: 'edge',
};

console.log('[Vercel] API handler loaded');

export default handle(app);
