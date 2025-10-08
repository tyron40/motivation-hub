const PRODUCTION_API_URL = 'https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app';

function sanitizeBaseUrl(input: string | undefined): string {
  const unsafe = input ?? '';
  const lowered = unsafe.toLowerCase();
  const isBad = !unsafe ||
    lowered.includes('rorktest.dev') ||
    lowered.includes('localhost') ||
    lowered.startsWith('http://') ||
    lowered.startsWith('https://a-');

  const finalUrl = isBad ? PRODUCTION_API_URL : unsafe;
  return finalUrl.endsWith('/') ? finalUrl.slice(0, -1) : finalUrl;
}

const API_BASE = sanitizeBaseUrl(process.env.EXPO_PUBLIC_RORK_API_BASE_URL);

console.log('🔧 ========================================');
console.log('🔧 API Client Configuration');
console.log('🔧 ========================================');
console.log('🔧 EXPO_PUBLIC_RORK_API_BASE_URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);
console.log('🔧 PRODUCTION_API_URL (fallback):', PRODUCTION_API_URL);
console.log('🔧 FINAL URL BEING USED:', API_BASE);
console.log('🔧 ========================================');

if (API_BASE.includes('rorktest.dev')) {
  console.warn('⚠️ WARNING: Using Rork development URL!');
  console.warn('⚠️ This will NOT work on physical devices. Forcing production URL.');
}

const DEFAULT_TIMEOUT = 45000;
const CONNECTION_TEST_TIMEOUT = 10000;

async function testConnection(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔍 Testing connection to:', url);

    if (url.includes('rorktest.dev') || url.includes('localhost')) {
      console.error('❌ Detected development URL - this will not work on physical devices');
      return {
        success: false,
        error: 'Development URL detected. Rebuild with production URL.'
      };
    }

    const pathsToTry = ['/api/health', '/health', '/'];
    for (const path of pathsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TEST_TIMEOUT);

        const response = await fetch(`${url}${path}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
          cache: 'no-store',
        });

        clearTimeout(timeoutId);
        console.log(`🔎 Probe ${path} -> ${response.status}`);

        if (response.ok || response.status === 401 || response.status === 403) {
          return { success: true };
        }
      } catch (innerErr: any) {
        console.log(`⚠️ Probe failed for one path: ${path}`, innerErr?.message);
      }
    }

    return { success: false, error: 'All health probes failed' };
  } catch (error: any) {
    console.log('❌ Connection test failed:', error);
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
    console.log('🎤 API Base URL:', API_BASE);
    console.log('🎤 Full URL:', `${API_BASE}/api/tts`);
    console.log('🎤 Text length:', params.text.length);
    console.log('🎤 Voice:', params.voice || 'alloy');

    console.log('🔍 Checking server connectivity...');
    const connectionResult = await testConnection(API_BASE);
    if (!connectionResult.success) {
      console.warn('⚠️ Server connectivity probe failed, attempting request anyway');
      console.warn('⚠️ Attempted URL:', API_BASE);
      console.warn('⚠️ Probe error:', connectionResult.error);
    } else {
      console.log('✅ Server connectivity confirmed');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(`${API_BASE}/api/tts`, {
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

    let result: any;
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
  } catch (error: any) {
    console.error('❌ TTS generation failed:', error);
    console.error('❌ Error name:', error?.name);
    console.error('❌ Error message:', error?.message);

    if (error?.name === 'AbortError') {
      throw new Error('Request timeout - please check your internet connection');
    }

    if (error?.message?.includes('Network request failed') ||
        error?.message?.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to server at ${API_BASE}. Please check:\n1. Internet connection\n2. Backend deployed and running\n3. URL in .env matches your Vercel URL\n4. Visit ${API_BASE}/api/health in a browser`);
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
    console.log('🤖 API Base URL:', API_BASE);
    console.log('🤖 Full URL:', `${API_BASE}/api/chat`);

    console.log('🔍 Checking server connectivity...');
    const connectionResult = await testConnection(API_BASE);
    if (!connectionResult.success) {
      console.warn('⚠️ Server connectivity probe failed, attempting request anyway');
      console.warn('⚠️ Attempted URL:', API_BASE);
      console.warn('⚠️ Probe error:', connectionResult.error);
    } else {
      console.log('✅ Server connectivity confirmed');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(`${API_BASE}/api/chat`, {
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

    let result: any;
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
  } catch (error: any) {
    console.error('❌ Chat request failed:', error);
    console.error('❌ Error name:', error?.name);
    console.error('❌ Error message:', error?.message);

    if (error?.name === 'AbortError') {
      throw new Error('Request timeout - please check your internet connection');
    }

    if (error?.message?.includes('Network request failed') ||
        error?.message?.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to server at ${API_BASE}. Please check:\n1. Internet connection\n2. Backend deployed and running\n3. URL in .env matches your Vercel URL\n4. Visit ${API_BASE}/api/health in a browser`);
    }

    throw error;
  }
}
