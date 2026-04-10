const VERCEL_BACKEND_URL = 'https://motivation-hub-iota.vercel.app';

export function getBackendUrl(): string {
  return VERCEL_BACKEND_URL;
}

export const API_ENDPOINTS = {
  chat: `${VERCEL_BACKEND_URL}/api/chat`,
  tts: `${VERCEL_BACKEND_URL}/api/tts`,
  stt: `${VERCEL_BACKEND_URL}/api/stt`,
  imageGenerate: `${VERCEL_BACKEND_URL}/api/image-generate`,
  health: `${VERCEL_BACKEND_URL}/api/health`,
  youtubeCategory: `${VERCEL_BACKEND_URL}/api/youtube/category`,
  youtubeSearch: `${VERCEL_BACKEND_URL}/api/youtube/search`,
  youtubeTrending: `${VERCEL_BACKEND_URL}/api/youtube/trending`,
  adminData: `${VERCEL_BACKEND_URL}/api/admin/data`,
  flyers: `${VERCEL_BACKEND_URL}/api/flyers`,
} as const;

console.log('🔧 Config | Vercel Backend URL:', VERCEL_BACKEND_URL);
