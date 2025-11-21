#!/usr/bin/env bun

/**
 * Direct test of the podcast RSS proxy endpoint
 * Tests both local and production Vercel backend
 */

const PRODUCTION_URL = 'https://motivation-hub-iota.vercel.app';
const TEST_RSS_URL = 'https://feeds.feedburner.com/thetonyrobbinspodcast';

async function testPodcastEndpoint(baseUrl: string) {
  console.log(`\n🧪 Testing podcast endpoint at: ${baseUrl}`);
  console.log('━'.repeat(80));
  
  try {
    // Test 1: Health check
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check response:', healthData);
    
    // Test 2: Direct tRPC query
    console.log('\n2️⃣ Testing tRPC podcast.rssFeed endpoint...');
    
    const tRPCUrl = `${baseUrl}/api/trpc/podcast.rssFeed?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { url: TEST_RSS_URL } }))}`;
    
    console.log('🌐 Request URL:', tRPCUrl);
    
    const tRPCResponse = await fetch(tRPCUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📊 Response status:', tRPCResponse.status);
    console.log('📊 Response headers:', Object.fromEntries(tRPCResponse.headers.entries()));
    
    if (!tRPCResponse.ok) {
      const errorText = await tRPCResponse.text();
      console.error('❌ Response error:', errorText);
      return;
    }
    
    const tRPCData = await tRPCResponse.json();
    console.log('✅ tRPC response:', JSON.stringify(tRPCData, null, 2).substring(0, 500), '...');
    
    // Test 3: POST request (as tRPC client would do)
    console.log('\n3️⃣ Testing POST request (like tRPC client)...');
    
    const postResponse = await fetch(`${baseUrl}/api/trpc/podcast.rssFeed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: TEST_RSS_URL,
      }),
    });
    
    console.log('📊 POST Response status:', postResponse.status);
    
    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error('❌ POST Response error:', errorText);
      return;
    }
    
    const postData = await postResponse.json();
    console.log('✅ POST response:', JSON.stringify(postData, null, 2).substring(0, 500), '...');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

async function main() {
  console.log('🚀 Starting podcast endpoint tests');
  console.log('━'.repeat(80));
  
  // Test production
  await testPodcastEndpoint(PRODUCTION_URL);
  
  console.log('\n' + '━'.repeat(80));
  console.log('✅ Tests complete!');
}

main().catch(console.error);
