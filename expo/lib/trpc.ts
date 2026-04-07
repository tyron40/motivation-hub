import { createTRPCReact, createTRPCProxyClient } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

import { getBackendUrl } from './config';

const getBaseUrl = () => {
  const url = getBackendUrl();
  console.log('🔧 [tRPC] Using Rork backend URL:', url);
  return url;
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
            try {
              const response = await fetch(url, options);
              console.log('✅ [tRPC] Response status:', response.status);
              
              if (!response.ok) {
                const clonedResponse = response.clone();
                const responseText = await clonedResponse.text();
                console.error('❌ [tRPC] Non-OK response:', response.status);
                console.error('❌ [tRPC] Response body:', responseText.substring(0, 500));
              }
              
              return response;
            } catch (error) {
              console.error('❌ [tRPC] Fetch error:', error);
              throw error;
            }
          },
        }),
      ],
    });
  } catch (error) {
    console.error('❌ Failed to create tRPC client:', error);
    
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
