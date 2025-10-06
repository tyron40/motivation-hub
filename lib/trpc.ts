import { createTRPCReact, createTRPCProxyClient } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const backendUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || process.env.EXPO_PUBLIC_TOOLKIT_URL;
  
  console.log('🔍 Checking backend URL...');
  console.log('🔍 EXPO_PUBLIC_RORK_API_BASE_URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);
  console.log('🔍 EXPO_PUBLIC_TOOLKIT_URL:', process.env.EXPO_PUBLIC_TOOLKIT_URL);
  console.log('🔍 All env vars:', Object.keys(process.env).filter(k => k.startsWith('EXPO_PUBLIC')));
  
  if (backendUrl) {
    console.log('✅ Using backend URL:', backendUrl);
    return backendUrl;
  }

  console.error('❌ Backend URL not found in environment variables');
  console.error('💡 The Rork platform should set EXPO_PUBLIC_TOOLKIT_URL automatically');
  console.error('💡 Make sure the backend is enabled in your Rork project');
  
  throw new Error(
    "Backend URL not configured. Please ensure the backend is enabled in Rork."
  );
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
            console.log('🌐 tRPC fetch:', url);
            try {
              const response = await fetch(url, options);
              console.log('✅ tRPC response status:', response.status);
              return response;
            } catch (error) {
              console.error('❌ tRPC fetch error:', error);
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
