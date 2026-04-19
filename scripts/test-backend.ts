#!/usr/bin/env bun

const BACKEND_URL = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'https://motivation-hub-iota.vercel.app';

console.log('🔍 Testing backend connection...');
console.log('📍 Backend URL:', BACKEND_URL);
console.log('');

async function testEndpoint(url: string, description: string) {
  try {
    console.log(`Testing: ${description}`);
    console.log(`URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`✅ Status: ${response.status}`);
    
    const text = await response.text();
    console.log(`📥 Response (first 200 chars): ${text.substring(0, 200)}`);
    
    try {
      const json = JSON.parse(text);
      console.log(`📦 JSON:`, JSON.stringify(json, null, 2));
    } catch {
      console.log('⚠️  Response is not JSON');
    }
    
    console.log('');
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log('');
    return false;
  }
}

async function testTRPC() {
  try {
    console.log('Testing: tRPC example.hi endpoint');
    const url = `${BACKEND_URL}/api/trpc/example.hi`;
    console.log(`URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`✅ Status: ${response.status}`);
    
    const text = await response.text();
    console.log(`📥 Response: ${text}`);
    console.log('');
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log('');
    return false;
  }
}

async function main() {
  const results = {
    root: await testEndpoint(`${BACKEND_URL}/`, 'Root endpoint'),
    api: await testEndpoint(`${BACKEND_URL}/api`, 'API endpoint'),
    health: await testEndpoint(`${BACKEND_URL}/api/health`, 'Health check'),
    trpc: await testTRPC(),
  };
  
  console.log('');
  console.log('='.repeat(50));
  console.log('Summary:');
  console.log('='.repeat(50));
  console.log(`Root endpoint: ${results.root ? '✅' : '❌'}`);
  console.log(`API endpoint: ${results.api ? '✅' : '❌'}`);
  console.log(`Health check: ${results.health ? '✅' : '❌'}`);
  console.log(`tRPC endpoint: ${results.trpc ? '✅' : '❌'}`);
  console.log('');
  
  if (!results.root && !results.api && !results.health) {
    console.log('❌ Backend is not responding at all.');
    console.log('');
    console.log('Possible solutions:');
    console.log('1. Redeploy your backend to Vercel');
    console.log('2. Check if the Vercel deployment URL is correct');
    console.log('3. Run locally with: bun start');
    console.log('4. Check Vercel logs for errors');
  } else if (!results.trpc) {
    console.log('⚠️  Backend is running but tRPC is not working.');
    console.log('');
    console.log('Possible solutions:');
    console.log('1. Check backend/hono.ts tRPC routes');
    console.log('2. Check backend/trpc/app-router.ts');
    console.log('3. Redeploy to Vercel');
  } else {
    console.log('✅ Backend is working correctly!');
  }
}

main();
