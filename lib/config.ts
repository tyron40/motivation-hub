const FALLBACK_VERCEL_BACKEND_URL = 'https://motivation-hub-iota.vercel.app';

const env = (typeof process !== 'undefined' && process.env) || {};

const backendCandidates: Array<{ source: string; value: string }> = [
  { source: 'EXPO_PUBLIC_VERCEL_API_BASE_URL', value: env.EXPO_PUBLIC_VERCEL_API_BASE_URL || '' },
  { source: 'EXPO_PUBLIC_RORK_API_BASE_URL', value: env.EXPO_PUBLIC_RORK_API_BASE_URL || '' },
  { source: 'EXPO_PUBLIC_API_BASE_URL', value: env.EXPO_PUBLIC_API_BASE_URL || '' },
  { source: 'EXPO_PUBLIC_TOOLKIT_URL', value: env.EXPO_PUBLIC_TOOLKIT_URL || '' },
];

const pickedCandidate = backendCandidates.find((c) => c.value.trim().length > 0);
const selectedBackendSource = pickedCandidate?.source || 'fallback';
const selectedBackendValue = pickedCandidate?.value || '';

const sanitizedEnvBackendUrl = selectedBackendValue.trim().replace(/\/+$/, '');
const VERCEL_BACKEND_URL = sanitizedEnvBackendUrl || FALLBACK_VERCEL_BACKEND_URL;

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

console.log(
  '🔧 Config | Active Vercel API Base URL:',
  VERCEL_BACKEND_URL,
  '| source:',
  selectedBackendSource
);
