// Test script to verify podcast RSS proxy endpoint on deployed backend
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import type { AppRouter } from '../backend/trpc/app-router';

const BACKEND_URL = 'https://motivation-hub-iota.vercel.app';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpLink({
      url: `${BACKEND_URL}/api/trpc`,
    }),
  ],
});

async function testPodcastEndpoint() {
  try {
    console.log('🧪 Testing podcast RSS proxy endpoint...');
    console.log('📡 Backend URL:', BACKEND_URL);
    
    const testUrl = 'https://feeds.megaphone.fm/motiversity';
    console.log(`📡 Testing with RSS feed: ${testUrl}`);
    
    const result = await client.podcast.rssFeed.query({ url: testUrl });
    
    console.log('✅ SUCCESS! Podcast endpoint is working');
    console.log(`✅ Received ${result.items.length} episodes`);
    console.log('✅ First episode:', result.items[0]?.title);
    
    return true;
  } catch (error) {
    console.error('❌ ERROR! Podcast endpoint failed');
    console.error('❌ Error:', error);
    
    if (error instanceof Error) {
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    
    return false;
  }
}

testPodcastEndpoint();
