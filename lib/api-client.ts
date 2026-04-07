import { API_ENDPOINTS } from './config';

console.log('🔧 API Client | Using Vercel backend endpoints');

const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1500 * Math.pow(2, attempt - 1), 6000);
        console.log(`[Retry] Attempt ${attempt + 1}/${retries} for ${url} after ${delay}ms`);
        await new Promise<void>(r => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      lastError = error;
      if (error?.name === 'AbortError') {
        console.error(`Request to ${url} timed out (attempt ${attempt + 1})`);
      } else {
        console.error(`Fetch error for ${url} (attempt ${attempt + 1}):`, error?.message || error);
      }
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
    console.log('🤖 Messages count:', params.messages.length);

    const response = await fetchWithRetry(API_ENDPOINTS.chat, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        messages: params.messages,
      }),
    });

    const contentType = response.headers.get('content-type');
    console.log('📡 Chat Response status:', response.status);

    if (!response.ok) {
      let errorMessage = `Chat API error: ${response.status}`;
      try {
        const errorText = await response.text();
        console.error('❌ Chat API error:', errorText.substring(0, 200));
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
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse chat response');
      throw new Error('Invalid JSON response from chat API');
    }

    if (!result.message || typeof result.message !== 'string') {
      throw new Error('Invalid chat response format');
    }

    console.log('✅ Chat response received, length:', result.message.length);
    return result;
  } catch (error: any) {
    console.error('❌ Chat request failed:', error?.message);

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
