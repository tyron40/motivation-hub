const PRODUCTION_API_URL = 'https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app';
const VERCEL_API_BASE = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || PRODUCTION_API_URL;

console.log('🔧 ========================================');
console.log('🔧 API Client Configuration');
console.log('🔧 ========================================');
console.log('🔧 EXPO_PUBLIC_RORK_API_BASE_URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);
console.log('🔧 PRODUCTION_API_URL (fallback):', PRODUCTION_API_URL);
console.log('🔧 FINAL URL BEING USED:', VERCEL_API_BASE);
console.log('🔧 ========================================');

if (VERCEL_API_BASE.includes('rorktest.dev')) {
  console.warn('⚠️ WARNING: Using Rork development URL!');
  console.warn('⚠️ This will NOT work on physical devices.');
  console.warn('⚠️ Please rebuild your app to pick up the correct URL from .env');
  console.warn('⚠️ Expected URL:', PRODUCTION_API_URL);
  console.warn('⚠️ Current URL:', VERCEL_API_BASE);
}

const DEFAULT_TIMEOUT = 45000;
const CONNECTION_TEST_TIMEOUT = 10000;

async function testConnection(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔍 Testing connection to:', url);
    console.log('🔍 Full health check URL:', `${url}/api/health`);
    
    if (url.includes('rorktest.dev')) {
      console.error('❌ Detected Rork development URL - this will not work on physical devices');
      return {
        success: false,
        error: 'App is using old development URL. Please rebuild the app to use the production URL.'
      };
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TEST_TIMEOUT);
    
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    
    clearTimeout(timeoutId);
    const isOk = response.ok;
    console.log(isOk ? '✅ Connection test passed' : '❌ Connection test failed:', response.status);
    
    if (isOk) {
      const data = await response.json();
      console.log('✅ Health check response:', data);
      return { success: true };
    }
    
    return { success: false, error: `Server returned status ${response.status}` };
  } catch (error: any) {
    console.log('❌ Connection test failed:', error);
    console.log('❌ Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack?.substring(0, 200),
    });
    
    if (error?.name === 'AbortError') {
      return { success: false, error: 'Connection timeout - server took too long to respond' };
    }
    
    return { success: false, error: error?.message || 'Network request failed' };
  }
}

export async function generateTextToSpeech(params: {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}): Promise<{ audio: { base64Data: string; mimeType: string } }> {
  try {
    console.log('🎤 Generating TTS via Vercel API...');
    console.log('🎤 API Base URL:', VERCEL_API_BASE);
    console.log('🎤 Full URL:', `${VERCEL_API_BASE}/api/tts`);
    console.log('🎤 Text length:', params.text.length);
    console.log('🎤 Voice:', params.voice || 'alloy');

    console.log('🔍 Checking server connectivity...');
    const connectionResult = await testConnection(VERCEL_API_BASE);
    if (!connectionResult.success) {
      console.error('❌ Server connectivity check failed');
      console.error('❌ Attempted URL:', VERCEL_API_BASE);
      console.error('❌ Error:', connectionResult.error);
      
      if (VERCEL_API_BASE.includes('rorktest.dev')) {
        throw new Error(
          'App is using an old development URL that no longer exists.\n\n' +
          'SOLUTION: Rebuild your app to pick up the correct production URL.\n\n' +
          'The app was built with: ' + VERCEL_API_BASE + '\n' +
          'But should use: ' + PRODUCTION_API_URL
        );
      }
      
      throw new Error(
        'Cannot reach the server.\n\n' +
        'Attempted URL: ' + VERCEL_API_BASE + '\n\n' +
        'Please verify:\n' +
        '1. Your internet connection is active\n' +
        '2. The backend is deployed and running\n' +
        '3. If you recently changed .env, rebuild the app'
      );
    }
    console.log('✅ Server connectivity confirmed');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(`${VERCEL_API_BASE}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        text: params.text,
        voice: params.voice || 'alloy',
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    console.log('📡 Response content-type:', contentType);
    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      let errorMessage = `TTS API error: ${response.status}`;
      try {
        const errorText = await response.text();
        console.error('❌ TTS API error response:', errorText.substring(0, 200));
        
        if (contentType?.includes('application/json')) {
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorMessage;
          } catch {
            errorMessage = errorText.substring(0, 100);
          }
        } else {
          errorMessage = `${errorMessage} - ${errorText.substring(0, 100)}`;
        }
      } catch (e) {
        console.error('❌ Could not read error response:', e);
      }
      throw new Error(errorMessage);
    }

    const responseText = await response.text();
    console.log('📥 Response text length:', responseText.length);
    console.log('📥 Response first 100 chars:', responseText.substring(0, 100));
    
    if (!contentType?.includes('application/json')) {
      console.error('❌ Response is not JSON, content-type:', contentType);
      console.error('❌ Response body:', responseText.substring(0, 500));
      throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse TTS response as JSON:', parseError);
      console.error('❌ Response was:', responseText.substring(0, 500));
      throw new Error(`Invalid JSON response from TTS API: ${responseText.substring(0, 100)}`);
    }
    console.log('✅ TTS result received');

    if (!result.audio || !result.audio.base64Data) {
      throw new Error('Invalid TTS response: missing audio data');
    }

    return result;
  } catch (error) {
    console.error('❌ TTS generation failed:', error);
    console.error('❌ Error name:', (error as any)?.name);
    console.error('❌ Error message:', (error as any)?.message);
    
    if ((error as any)?.name === 'AbortError') {
      throw new Error('Request timeout - please check your internet connection');
    }
    
    if ((error as any)?.message?.includes('Network request failed') || 
        (error as any)?.message?.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to server at ${VERCEL_API_BASE}. Please check:\n1. Your internet connection\n2. The backend is deployed and running\n3. The URL in .env is correct`);
    }
    
    throw error;
  }
}

export async function sendChatMessage(params: {
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
}): Promise<{ message: string }> {
  try {
    console.log('🤖 Sending chat message via Vercel API...');
    console.log('🤖 API Base URL:', VERCEL_API_BASE);
    console.log('🤖 Full URL:', `${VERCEL_API_BASE}/api/chat`);

    console.log('🔍 Checking server connectivity...');
    const connectionResult = await testConnection(VERCEL_API_BASE);
    if (!connectionResult.success) {
      console.error('❌ Server connectivity check failed');
      console.error('❌ Attempted URL:', VERCEL_API_BASE);
      console.error('❌ Error:', connectionResult.error);
      
      if (VERCEL_API_BASE.includes('rorktest.dev')) {
        throw new Error(
          'App is using an old development URL that no longer exists.\n\n' +
          'SOLUTION: Rebuild your app to pick up the correct production URL.\n\n' +
          'The app was built with: ' + VERCEL_API_BASE + '\n' +
          'But should use: ' + PRODUCTION_API_URL
        );
      }
      
      throw new Error(
        'Cannot reach the server.\n\n' +
        'Attempted URL: ' + VERCEL_API_BASE + '\n\n' +
        'Please verify:\n' +
        '1. Your internet connection is active\n' +
        '2. The backend is deployed and running\n' +
        '3. If you recently changed .env, rebuild the app'
      );
    }
    console.log('✅ Server connectivity confirmed');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(`${VERCEL_API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        messages: params.messages,
      }),
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    console.log('📡 Response content-type:', contentType);
    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      let errorMessage = `Chat API error: ${response.status}`;
      try {
        const errorText = await response.text();
        console.error('❌ Chat API error response:', errorText.substring(0, 200));
        
        if (contentType?.includes('application/json')) {
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorMessage;
          } catch {
            errorMessage = errorText.substring(0, 100);
          }
        } else {
          errorMessage = `${errorMessage} - ${errorText.substring(0, 100)}`;
        }
      } catch (e) {
        console.error('❌ Could not read error response:', e);
      }
      throw new Error(errorMessage);
    }

    const responseText = await response.text();
    console.log('📥 Response text length:', responseText.length);
    console.log('📥 Response first 100 chars:', responseText.substring(0, 100));
    
    if (!contentType?.includes('application/json')) {
      console.error('❌ Response is not JSON, content-type:', contentType);
      console.error('❌ Response body:', responseText.substring(0, 500));
      throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse chat response as JSON:', parseError);
      console.error('❌ Response was:', responseText.substring(0, 500));
      throw new Error(`Invalid JSON response from chat API: ${responseText.substring(0, 100)}`);
    }
    console.log('✅ Chat response received');

    if (!result.message || typeof result.message !== 'string') {
      throw new Error('Invalid chat response format');
    }

    return result;
  } catch (error) {
    console.error('❌ Chat request failed:', error);
    console.error('❌ Error name:', (error as any)?.name);
    console.error('❌ Error message:', (error as any)?.message);
    
    if ((error as any)?.name === 'AbortError') {
      throw new Error('Request timeout - please check your internet connection');
    }
    
    if ((error as any)?.message?.includes('Network request failed') || 
        (error as any)?.message?.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to server at ${VERCEL_API_BASE}. Please check:\n1. Your internet connection\n2. The backend is deployed and running\n3. The URL in .env is correct`);
    }
    
    throw error;
  }
}
