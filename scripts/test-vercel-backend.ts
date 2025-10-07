#!/usr/bin/env bun

const BACKEND_URL = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'https://motivation-9ji3go7xt-tyrons-projects-584a5697.vercel.app';

console.log('🔍 Testing Vercel backend...');
console.log('📍 Backend URL:', BACKEND_URL);
console.log('');

async function testEndpoint(path: string, description: string) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📍 URL: ${BACKEND_URL}${path}`);
  
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}`);
    
    const text = await response.text();
    console.log(`📥 Response (first 500 chars):`);
    console.log(text.substring(0, 500));
    
    if (response.ok) {
      try {
        const json = JSON.parse(text);
        console.log(`✅ Valid JSON response:`, json);
      } catch {
        console.log(`⚠️ Response is not JSON`);
      }
    } else {
      console.log(`❌ Request failed with status ${response.status}`);
    }
  } catch (error) {
    console.error(`❌ Error:`, error);
  }
}

async function main() {
  await testEndpoint('/', 'Root endpoint');
  await testEndpoint('/api', 'API endpoint');
  await testEndpoint('/api/health', 'Health check');
  await testEndpoint('/health', 'Health check (no /api prefix)');
  
  console.log('\n\n🔍 Testing tRPC endpoint...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/trpc/example.hi`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log(`✅ Status: ${response.status}`);
    const text = await response.text();
    console.log(`📥 Response:`, text.substring(0, 500));
  } catch (error) {
    console.error(`❌ Error:`, error);
  }
  
  console.log('\n\n📊 Summary:');
  console.log('If all endpoints return 404 or network errors, your Vercel deployment is not working.');
  console.log('Please check:');
  console.log('1. Is your backend deployed to Vercel?');
  console.log('2. Is the URL correct in your .env file?');
  console.log('3. Check Vercel deployment logs for errors');
  console.log('4. Verify vercel.json configuration');
}

main();
