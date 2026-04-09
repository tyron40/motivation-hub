const RORK_API_BASE_URL = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '';

export function getBackendUrl(): string {
  return RORK_API_BASE_URL;
}

export const API_ENDPOINTS = {
  chat: `${RORK_API_BASE_URL}/api/chat`,
  tts: `${RORK_API_BASE_URL}/api/tts`,
  stt: `${RORK_API_BASE_URL}/api/stt`,
  imageGenerate: `${RORK_API_BASE_URL}/api/image-generate`,
  health: `${RORK_API_BASE_URL}/api/health`,
  youtubeCategory: `${RORK_API_BASE_URL}/api/youtube/category`,
  youtubeSearch: `${RORK_API_BASE_URL}/api/youtube/search`,
  youtubeTrending: `${RORK_API_BASE_URL}/api/youtube/trending`,
  adminData: `${RORK_API_BASE_URL}/api/admin/data`,
  flyers: `${RORK_API_BASE_URL}/api/flyers`,
} as const;

console.log('🔧 Config | Rork Backend URL:', RORK_API_BASE_URL);
