import { Platform } from 'react-native';
import { API_ENDPOINTS } from './config';
import { generateText } from '@rork-ai/toolkit-sdk';

const TOOLKIT_BASE_URL = process.env.EXPO_PUBLIC_TOOLKIT_URL || 'https://toolkit.rork.com';

console.log('🔧 API Client initialized | Platform:', Platform.OS, '| Toolkit:', TOOLKIT_BASE_URL);

const CHAT_TIMEOUT = 60000;
const TTS_TIMEOUT = 30000;
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 2;

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
  console.log('🎤 TTS | text length:', params.text.length, '| voice:', params.voice || 'alloy');

  const response = await fetchWithRetry(
    API_ENDPOINTS.tts,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        voice: params.voice || 'alloy',
      }),
    },
    MAX_RETRIES,
    TTS_TIMEOUT
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('❌ TTS error:', response.status, errorText.substring(0, 200));
    throw new Error(`TTS failed: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    console.error('❌ TTS response not JSON:', contentType);
    throw new Error('Invalid TTS response format');
  }

  const responseText = await response.text();
  if (!responseText || responseText.trim().length === 0) {
    throw new Error('Empty TTS response');
  }

  const result = JSON.parse(responseText);

  if (!result?.audio?.base64Data) {
    console.error('❌ TTS missing audio data in response');
    throw new Error('Invalid TTS response: missing audio data');
  }

  console.log('✅ TTS success');
  return result;
}

async function chatViaSDK(
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  console.log('🤖 [Strategy 1] generateText SDK | messages:', messages.length);

  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error('SDK timeout after 55s'));
    }, 55000);
  });

  const sdkPromise = generateText({ messages });

  const result = await Promise.race([sdkPromise, timeoutPromise]);

  if (!result || typeof result !== 'string' || result.trim().length === 0) {
    throw new Error('SDK returned empty result');
  }

  console.log('✅ [Strategy 1] SDK success | length:', result.length);
  return result;
}

async function chatViaDirectLLM(
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const llmTextUrl = `${TOOLKIT_BASE_URL.replace(/\/$/, '')}/llm/text`;
  console.log('🤖 [Strategy 2] Direct /llm/text fetch:', llmTextUrl);

  const response = await fetchWithTimeout(
    llmTextUrl,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ messages }),
    },
    CHAT_TIMEOUT
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('❌ [Strategy 2] Error:', response.status, errorText.substring(0, 300));
    throw new Error(`LLM API error: ${response.status} - ${errorText.substring(0, 100)}`);
  }

  const responseText = await response.text();
  console.log('📡 [Strategy 2] Raw response length:', responseText.length);

  if (!responseText || responseText.trim().length === 0) {
    throw new Error('Empty response from /llm/text');
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    console.error('❌ [Strategy 2] Failed to parse JSON response');
    throw new Error('Failed to parse /llm/text response');
  }

  const completion = data?.completion;
  if (!completion || typeof completion !== 'string' || completion.trim().length === 0) {
    const dataStr = JSON.stringify(data).substring(0, 300);
    console.error('❌ [Strategy 2] Unexpected format:', dataStr);

    const fallbackText = data?.text ?? data?.message ?? data?.result ?? '';
    if (fallbackText && typeof fallbackText === 'string' && fallbackText.trim().length > 0) {
      console.log('✅ [Strategy 2] Used fallback field | length:', fallbackText.length);
      return fallbackText.trim();
    }

    throw new Error('Unexpected response format from /llm/text');
  }

  console.log('✅ [Strategy 2] /llm/text success | length:', completion.length);
  return completion;
}

async function chatViaBackend(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
): Promise<string> {
  console.log('🤖 [Strategy 3] Backend /api/chat');

  const response = await fetchWithTimeout(
    API_ENDPOINTS.chat,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ messages }),
    },
    CHAT_TIMEOUT
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('❌ [Strategy 3] Error:', response.status, errorText.substring(0, 200));
    throw new Error(`Backend chat error: ${response.status}`);
  }

  const data = await response.json();
  const message = data?.message;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('Backend returned empty message');
  }

  console.log('✅ [Strategy 3] Backend success | length:', message.length);
  return message;
}

export async function sendChatMessage(params: {
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
}): Promise<{ message: string }> {
  const toolkitMessages = params.messages.map(m => ({
    role: (m.role === 'system' ? 'user' : m.role) as 'user' | 'assistant',
    content: m.content,
  }));

  console.log('🤖 sendChatMessage | Platform:', Platform.OS, '| messages:', params.messages.length);
  console.log('🤖 Toolkit URL:', TOOLKIT_BASE_URL);
  console.log('🤖 Backend URL:', API_ENDPOINTS.chat);

  const errors: string[] = [];

  try {
    const result = await chatViaSDK(toolkitMessages);
    console.log('✅ Chat completed via SDK');
    return { message: result };
  } catch (e: any) {
    const msg = e?.message || String(e);
    errors.push(`SDK: ${msg}`);
    console.warn('⚠️ Strategy 1 (SDK) failed:', msg);
  }

  try {
    const result = await chatViaDirectLLM(toolkitMessages);
    console.log('✅ Chat completed via direct /llm/text');
    return { message: result };
  } catch (e: any) {
    const msg = e?.message || String(e);
    errors.push(`DirectLLM: ${msg}`);
    console.warn('⚠️ Strategy 2 (Direct /llm/text) failed:', msg);
  }

  try {
    const result = await chatViaBackend(params.messages);
    console.log('✅ Chat completed via backend');
    return { message: result };
  } catch (e: any) {
    const msg = e?.message || String(e);
    errors.push(`Backend: ${msg}`);
    console.warn('⚠️ Strategy 3 (Backend) failed:', msg);
  }

  console.error('❌ All 3 chat strategies failed:', errors.join(' | '));

  const combinedMsg = errors.join('; ');
  if (combinedMsg.includes('timed out') || combinedMsg.includes('AbortError')) {
    throw new Error('Request timed out. Please check your connection and try again.');
  }
  if (combinedMsg.includes('Network request failed') || combinedMsg.includes('Failed to fetch')) {
    throw new Error('Network error. Please check your internet connection.');
  }

  throw new Error('Unable to get AI response. Please try again.');
}
