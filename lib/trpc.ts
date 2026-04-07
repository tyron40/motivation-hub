import { createTRPCReact, createTRPCProxyClient } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

const PRODUCTION_API_URL = 'https://motivation-hub-iota.vercel.app';

const getBaseUrl = () => {
  const backendUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? '';
  const trimmed = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
  const finalUrl = trimmed || PRODUCTION_API_URL;
  console.log('🔧 [tRPC] Using backend URL:', finalUrl);
  return finalUrl;
};

let cachedBaseUrl: string | null = null;
let initializationAttempted = false;

const getSafeBaseUrl = () => {
  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }
  
  if (!initializationAttempted) {
    initializationAttempted = true;
    try {
      cachedBaseUrl = getBaseUrl();
      return cachedBaseUrl;
    } catch (error) {
      console.error('❌ Failed to get base URL on first attempt:', error);
      console.error('❌ This error will be thrown on the first tRPC call');
      throw error;
    }
  }
  
  try {
    cachedBaseUrl = getBaseUrl();
    return cachedBaseUrl;
  } catch (error) {
    console.error('❌ Failed to get base URL:', error);
    throw error;
  }
};

function createTRPCClient() {
  try {
    const baseUrl = getSafeBaseUrl();
    return createTRPCProxyClient<AppRouter>({
      links: [
        httpLink({
          url: `${baseUrl}/api/trpc`,
          fetch: async (url, options) => {
            console.log('🌐 [tRPC] Fetching:', url);
            console.log('🌐 [tRPC] Method:', options?.method || 'GET');
            try {
              const response = await fetch(url, options);
              console.log('✅ [tRPC] Response status:', response.status);
              console.log('✅ [tRPC] Response content-type:', response.headers.get('content-type'));
              
              const clonedResponse = response.clone();
              const responseText = await clonedResponse.text();
              console.log('📥 [tRPC] Response preview (first 200 chars):', responseText.substring(0, 200));
              
              if (!response.ok) {
                console.error('❌ [tRPC] Non-OK response:', response.status);
                console.error('❌ [tRPC] Response body:', responseText.substring(0, 500));
              }
              
              if (response.headers.get('content-type')?.includes('text/html')) {
                console.error('❌ [tRPC] Received HTML instead of JSON!');
                console.error('❌ [tRPC] This usually means the backend route is not found or misconfigured');
                console.error('❌ [tRPC] Full HTML response:', responseText.substring(0, 1000));
              }
              
              return response;
            } catch (error) {
              console.error('❌ [tRPC] Fetch error:', error);
              console.error('❌ [tRPC] Error type:', error?.constructor?.name);
              throw error;
            }
          },
        }),
      ],
    });
  } catch (error) {
    console.error('❌ Failed to create tRPC client:', error);
    console.error('❌ The app will not be able to connect to the backend');
    console.error('❌ Please restart the development server with: bun start');
    
    // Return a dummy client that will throw errors on any call
    return createTRPCProxyClient<AppRouter>({
      links: [
        httpLink({
          url: 'http://localhost:0/api/trpc',
        }),
      ],
    });
  }
}

export const trpcClient = createTRPCClient();
