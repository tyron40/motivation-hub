import { Platform } from 'react-native';
import { API_ENDPOINTS } from './config';

console.log('🔧 API Client | Using Vercel backend endpoints');
console.log('🔧 API Client | Chat endpoint:', API_ENDPOINTS.chat);
console.log('🔧 API Client | Platform:', Platform.OS);

const CHAT_TIMEOUT = 60000;
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  console.log(`📡 Fetching ${url} (timeout: ${timeout}ms, platform: ${Platform.OS})`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`⏱️ Request to ${url} timed out after ${timeout}ms`);
    controller.abort();
  }, timeout);

  try {
    const fetchOptions: RequestInit = {
      ...options,
      signal: controller.signal,
    };

    if (Platform.OS !== 'web') {
      fetchOptions.headers = {
        ...fetchOptions.headers as Record<string, string>,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      };
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    console.log(`📡 Response received from ${url}: status=${response.status}`);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`📡 Fetch error for ${url}:`, error?.message || error?.name || 'Unknown error');
    if (error?.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms. Please check your connection.`);
    }
    throw error;
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(2000 * attempt, 5000);
        console.log(`[Retry] Attempt ${attempt + 1}/${retries} for ${url} after ${delay}ms`);
        await new Promise<void>(r => setTimeout(r, delay));
      }

      const response = await fetchWithTimeout(url, options, timeout);
      console.log(`✅ Fetch success for ${url} (attempt ${attempt + 1}), status: ${response.status}`);
      return response;
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Fetch error for ${url} (attempt ${attempt + 1}):`, error?.message || error);
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

export async function generateTextToSpeech(params: {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}): Promise<{ audio: { base64Data: string; mimeType: string } }> {
  try {
    console.log('🎤 Generating TTS via Vercel API...');
    console.log('🎤 Text length:', params.text.length, 'Voice:', params.voice || 'alloy');

    const response = await fetchWithRetry(API_ENDPOINTS.tts, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        voice: params.voice || 'alloy',
      }),
    });

    const contentType = response.headers.get('content-type');
    console.log('📡 TTS Response status:', response.status);

    if (!response.ok) {
      let errorMessage = `TTS API error: ${response.status}`;
      try {
        const errorText = await response.text();
        console.error('❌ TTS API error:', errorText.substring(0, 200));
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

    if (!contentType?.includes('application/json')) {
      console.error('❌ Response is not JSON, content-type:', contentType);
      throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
    }

    let result: any;
    try {
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from server');
      }
      result = JSON.parse(responseText);
    } catch (parseError: any) {
      console.error('❌ Failed to parse TTS response:', parseError?.message);
      throw new Error(`Failed to parse server response: ${parseError?.message || 'Unknown parse error'}`);
    }

    if (!result.audio || !result.audio.base64Data) {
      console.error('❌ Invalid TTS result structure');
      throw new Error('Invalid TTS response: missing audio data');
    }

    console.log('✅ TTS result received');
    return result;
  } catch (error: any) {
    console.error('❌ TTS generation failed:', error?.message);

    if (error?.name === 'AbortError') {
      throw new Error('Request timeout - please check your internet connection');
    }

    if (error?.message?.includes('Network request failed') ||
        error?.message?.includes('Failed to fetch')) {
      throw new Error('Cannot connect to Vercel backend. Please check your internet connection.');
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
    console.log('🤖 Endpoint:', API_ENDPOINTS.chat);
    console.log('🤖 Messages count:', params.messages.length);
    console.log('🤖 Platform:', Platform.OS);

    const body = JSON.stringify({ messages: params.messages });
    console.log('🤖 Request body size:', body.length);

    const response = await fetchWithRetry(
      API_ENDPOINTS.chat,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body,
      },
      MAX_RETRIES,
      CHAT_TIMEOUT
    );

    const contentType = response.headers.get('content-type') || '';
    console.log('📡 Chat Response status:', response.status, 'content-type:', contentType);

    const responseText = await response.text();
    console.log('📡 Chat Response length:', responseText.length);

    if (!response.ok) {
      let errorMessage = `Chat API error: ${response.status}`;
      console.error('❌ Chat API error body:', responseText.substring(0, 300));
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.error || errorJson.message || errorJson.details || errorMessage;
      } catch {
        if (responseText.length > 0) {
          errorMessage = `${errorMessage} - ${responseText.substring(0, 150)}`;
        }
      }
      throw new Error(errorMessage);
    }

    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from chat API');
    }

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse chat response, first 200 chars:', responseText.substring(0, 200));
      throw new Error('Invalid JSON response from chat API');
    }

    if (!result.message || typeof result.message !== 'string') {
      console.error('❌ Invalid chat response structure:', JSON.stringify(result).substring(0, 200));
      throw new Error('Invalid chat response format - missing message field');
    }

    console.log('✅ Chat response received, length:', result.message.length);
    return result;
  } catch (error: any) {
    console.error('❌ Chat request failed:', error?.message || String(error));
    console.error('❌ Error type:', error?.name, 'Platform:', Platform.OS);

    if (error?.message?.includes('timed out') || error?.name === 'AbortError') {
      throw new Error('Request timed out. The server may be slow. Please try again.');
    }

    if (error?.message?.includes('Network request failed') ||
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('network') ||
        error?.message?.includes('TypeError')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }

    throw error;
  }
}
