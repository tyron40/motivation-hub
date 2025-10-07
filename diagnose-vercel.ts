const VERCEL_URL = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app';

console.log('🔍 Vercel Backend Diagnostics');
console.log('='.repeat(70));
console.log('');

console.log('📋 Configuration:');
console.log('  Base URL:', VERCEL_URL);
console.log('  EXPO_PUBLIC_RORK_API_BASE_URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '(not set)');
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set (length: ' + process.env.OPENAI_API_KEY.length + ')' : '❌ Not set');
console.log('');

async function diagnoseEndpoint(name: string, url: string, options?: RequestInit) {
  console.log('='.repeat(70));
  console.log(`🔍 Diagnosing: ${name}`);
  console.log('='.repeat(70));
  console.log(`📍 URL: ${url}`);
  console.log(`📤 Method: ${options?.method || 'GET'}`);
  
  if (options?.body) {
    console.log(`📦 Body: ${options.body}`);
  }
  
  console.log('');
  
  try {
    console.log('⏳ Sending request...');
    const startTime = Date.now();
    
    const response = await fetch(url, options);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log('');
    
    console.log('📡 Response Headers:');
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log(`  Content-Type: ${response.headers.get('content-type')}`);
    console.log(`  Content-Length: ${response.headers.get('content-length') || 'unknown'}`);
    console.log(`  Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin') || 'not set'}`);
    console.log('');
    
    const contentType = response.headers.get('content-type');
    const responseText = await response.text();
    
    console.log('📥 Response Body:');
    console.log(`  Length: ${responseText.length} characters`);
    console.log(`  First 100 chars: ${responseText.substring(0, 100)}`);
    console.log('');
    
    if (contentType?.includes('application/json')) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Valid JSON Response:');
        console.log(JSON.stringify(data, null, 2).substring(0, 1000));
        console.log('');
        
        if (response.ok) {
          console.log('✅ SUCCESS: Endpoint is working correctly');
        } else {
          console.log('⚠️  WARNING: Endpoint returned error status');
          if (data.error) {
            console.log(`   Error: ${data.error}`);
          }
          if (data.details) {
            console.log(`   Details: ${data.details}`);
          }
        }
      } catch (parseError) {
        console.log('❌ ERROR: Response claims to be JSON but failed to parse');
        console.log(`   Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        console.log(`   Full response: ${responseText.substring(0, 500)}`);
      }
    } else if (contentType?.includes('text/html')) {
      console.log('⚠️  WARNING: Endpoint returned HTML instead of JSON');
      console.log('   This usually means:');
      console.log('   1. The route is not configured correctly');
      console.log('   2. Vercel is showing an error page');
      console.log('   3. The endpoint does not exist');
      console.log('');
      console.log('   HTML content (first 500 chars):');
      console.log('   ' + responseText.substring(0, 500).replace(/\n/g, '\n   '));
    } else {
      console.log('📝 Response (first 500 chars):');
      console.log(responseText.substring(0, 500));
    }
    
    console.log('');
    return response.ok;
  } catch (error) {
    console.log('❌ FATAL ERROR: Request failed');
    console.log(`   Error type: ${(error as any)?.name || 'Unknown'}`);
    console.log(`   Error message: ${error instanceof Error ? error.message : String(error)}`);
    console.log('');
    console.log('   Possible causes:');
    console.log('   1. Network connection issue');
    console.log('   2. Vercel deployment is down');
    console.log('   3. URL is incorrect');
    console.log('   4. CORS issue (check browser console)');
    console.log('');
    return false;
  }
}

async function runDiagnostics() {
  const results: Record<string, boolean> = {};
  
  results['Root'] = await diagnoseEndpoint(
    'Root Endpoint',
    `${VERCEL_URL}/`
  );
  
  results['Health (no prefix)'] = await diagnoseEndpoint(
    'Health Check (no /api prefix)',
    `${VERCEL_URL}/health`
  );
  
  results['Health (with prefix)'] = await diagnoseEndpoint(
    'Health Check (with /api prefix)',
    `${VERCEL_URL}/api/health`
  );
  
  results['TTS'] = await diagnoseEndpoint(
    'TTS Endpoint',
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
  
  results['Chat'] = await diagnoseEndpoint(
    'Chat Endpoint',
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
  
  console.log('='.repeat(70));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(70));
  console.log('');
  
  let passed = 0;
  let failed = 0;
  
  for (const [name, success] of Object.entries(results)) {
    const icon = success ? '✅' : '❌';
    console.log(`${icon} ${name}: ${success ? 'PASSED' : 'FAILED'}`);
    if (success) passed++;
    else failed++;
  }
  
  console.log('');
  console.log(`Total: ${passed} passed, ${failed} failed out of ${Object.keys(results).length} tests`);
  console.log('');
  
  if (failed > 0) {
    console.log('🔧 TROUBLESHOOTING STEPS:');
    console.log('');
    console.log('1. Check Vercel Deployment:');
    console.log('   - Visit: https://vercel.com/dashboard');
    console.log('   - Check if latest deployment is successful');
    console.log('   - Review deployment logs');
    console.log('');
    console.log('2. Verify Environment Variables:');
    console.log('   - Go to: Project Settings > Environment Variables');
    console.log('   - Ensure OPENAI_API_KEY is set');
    console.log('   - Ensure EXPO_PUBLIC_SUPABASE_URL is set');
    console.log('   - Ensure EXPO_PUBLIC_SUPABASE_ANON_KEY is set');
    console.log('   - Redeploy after adding variables');
    console.log('');
    console.log('3. Check Vercel Logs:');
    console.log('   - Run: vercel logs');
    console.log('   - Look for error messages');
    console.log('');
    console.log('4. Verify Configuration Files:');
    console.log('   - Check vercel.json rewrites');
    console.log('   - Check api/index.ts exports');
    console.log('   - Check backend/hono.ts routes');
    console.log('');
    console.log('5. Test Locally:');
    console.log('   - Run: bun run backend/hono.ts');
    console.log('   - Test endpoints on localhost');
    console.log('   - Compare with production behavior');
    console.log('');
  } else {
    console.log('🎉 SUCCESS! All endpoints are working correctly!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Your backend is ready to use');
    console.log('2. Test in your mobile app');
    console.log('3. Monitor Vercel logs for any issues');
    console.log('');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runDiagnostics().catch((error) => {
  console.error('');
  console.error('💥 CRITICAL ERROR: Diagnostics failed to run');
  console.error('   Error:', error);
  console.error('');
  process.exit(1);
});
