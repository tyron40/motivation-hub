import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../backend/trpc/app-router';
import { supabase } from './supabase';

const getBaseUrl = () => {
  const apiUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_RORK_API_BASE_URL is not set');
  }
  return apiUrl;
};

async function getAuthHeaders() {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  
  return token
    ? {
        authorization: `Bearer ${token}`,
      }
    : {};
}

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      async headers() {
        return await getAuthHeaders();
      },
    }),
  ],
});

export function createTRPCClientForReact() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        async headers() {
          return await getAuthHeaders();
        },
      }),
    ],
  });
}
