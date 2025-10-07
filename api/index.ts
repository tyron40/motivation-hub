import { handle } from "hono/vercel";
import app from "../backend/hono";

export const config = {
  runtime: 'edge',
};

export default handle(app);
