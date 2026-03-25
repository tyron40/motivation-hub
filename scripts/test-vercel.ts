const VERCEL_URL = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app';

async function testEndpoint(name: string, url: string, options?: RequestInit) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`📍 URL: ${url}`);
  
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    
    console.log(`📡 Status: ${response.status} ${response.statusText}`);
    console.log(`📄 Content-Type: ${contentType}`);
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      console.log(`✅ Response:`, JSON.stringify(data, null, 2).substring(0, 500));
    } else {
      const text = await response.text();
      console.log(`📝 Response (first 200 chars):`, text.substring(0, 200));
    }
    
    return response.ok;
  } catch (error) {
    console.error(`❌ Error:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing Vercel Deployment');
  console.log('='.repeat(60));
  console.log(`🌐 Base URL: ${VERCEL_URL}`);
  
  const results: Record<string, boolean> = {};
  
  results['Root'] = await testEndpoint(
    'Root endpoint',
    `${VERCEL_URL}/`
  );
  
  results['Health (no prefix)'] = await testEndpoint(
    'Health check (no /api prefix)',
    `${VERCEL_URL}/health`
  );
  
  results['Health (with prefix)'] = await testEndpoint(
    'Health check (with /api prefix)',
    `${VERCEL_URL}/api/health`
  );
  
  results['TTS'] = await testEndpoint(
    'TTS endpoint',
    `${VERCEL_URL}/api/tts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text: 'Hello world',
        voice: 'alloy',
      }),
    }
  );
  
  results['Chat'] = await testEndpoint(
    'Chat endpoint',
    `${VERCEL_URL}/api/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Say hello in one word' }
        ],
      }),
    }
  );
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const [name, success] of Object.entries(results)) {
    const icon = success ? '✅' : '❌';
    console.log(`${icon} ${name}: ${success ? 'PASSED' : 'FAILED'}`);
    if (success) passed++;
    else failed++;
  }
  
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}/${Object.keys(results).length}`);
  console.log(`❌ Failed: ${failed}/${Object.keys(results).length}`);
  
  if (failed > 0) {
    console.log('\n💡 Troubleshooting tips:');
    console.log('  1. Check Vercel logs: vercel logs');
    console.log('  2. Verify environment variables in Vercel dashboard');
    console.log('  3. Make sure latest code is deployed: vercel --prod');
    console.log('  4. Check vercel.json rewrites configuration');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
