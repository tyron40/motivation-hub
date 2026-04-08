import { Platform } from 'react-native';
import { API_ENDPOINTS } from './config';
import { generateText } from '@rork-ai/toolkit-sdk';

const TOOLKIT_URL = process.env.EXPO_PUBLIC_TOOLKIT_URL || 'https://toolkit.rork.com';

console.log('🔧 API Client initialized | Platform:', Platform.OS);

const CHAT_TIMEOUT = 60000;
const TTS_TIMEOUT = 30000;
const MAX_RETRIES = 2;

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`⏱️ Request to ${url} timed out after ${timeout}ms`);
    controller.abort();
  }, timeout);

  try {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (Platform.OS !== 'web') {
      headers['Cache-Control'] = 'no-cache';
      headers['Pragma'] = 'no-cache';
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES,
  timeout: number = TTS_TIMEOUT
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(2000 * attempt, 5000);
        console.log(`[Retry] Attempt ${attempt + 1}/${retries} after ${delay}ms`);
        await new Promise<void>(r => setTimeout(r, delay));
      }
      return await fetchWithTimeout(url, options, timeout);
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Fetch attempt ${attempt + 1} failed:`, error?.message || error);
    }
  }

  throw lastError || new Error(`Failed after ${retries} attempts`);
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
    setTimeout(() => reject(new Error('SDK timeout after 45s')), 45000);
  });

  const sdkPromise = generateText({ messages });

  const result = await Promise.race([sdkPromise, timeoutPromise]);

  if (!result || typeof result !== 'string' || result.trim().length === 0) {
    throw new Error('SDK returned empty result');
  }

  console.log('✅ [Strategy 1] SDK success | length:', result.length);
  return result;
}

async function chatViaToolkitDirect(
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const agentUrl = new URL('/agent/chat', TOOLKIT_URL).toString();
  console.log('🤖 [Strategy 2] Direct toolkit fetch:', agentUrl);

  const response = await fetchWithTimeout(
    agentUrl,
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
    console.error('❌ [Strategy 2] Error:', response.status, errorText.substring(0, 200));
    throw new Error(`Toolkit API error: ${response.status}`);
  }

  const responseText = await response.text();
  console.log('📡 [Strategy 2] Raw response length:', responseText.length);

  if (!responseText || responseText.trim().length === 0) {
    throw new Error('Empty response from toolkit');
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    if (responseText.trim().length > 0) {
      console.log('✅ [Strategy 2] Plain text response');
      return responseText.trim();
    }
    throw new Error('Failed to parse toolkit response');
  }

  const message =
    typeof data === 'string' ? data :
    data?.text ?? data?.message ?? data?.result ??
    data?.choices?.[0]?.message?.content ?? '';

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    console.error('❌ [Strategy 2] Unexpected format:', JSON.stringify(data).substring(0, 200));
    throw new Error('Unexpected response format from toolkit');
  }

  console.log('✅ [Strategy 2] Toolkit success | length:', message.length);
  return message;
}

async function chatViaBackend(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
): Promise<string> {
  console.log('🤖 [Strategy 3] Backend Hono /api/chat');

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

  const errors: string[] = [];

  try {
    const result = await chatViaSDK(toolkitMessages);
    return { message: result };
  } catch (e: any) {
    const msg = e?.message || String(e);
    errors.push(`SDK: ${msg}`);
    console.warn('⚠️ Strategy 1 failed:', msg);
  }

  try {
    const result = await chatViaToolkitDirect(toolkitMessages);
    return { message: result };
  } catch (e: any) {
    const msg = e?.message || String(e);
    errors.push(`Toolkit: ${msg}`);
    console.warn('⚠️ Strategy 2 failed:', msg);
  }

  try {
    const result = await chatViaBackend(params.messages);
    return { message: result };
  } catch (e: any) {
    const msg = e?.message || String(e);
    errors.push(`Backend: ${msg}`);
    console.warn('⚠️ Strategy 3 failed:', msg);
  }

  console.error('❌ All chat strategies failed:', errors.join(' | '));

  const combinedMsg = errors.join('; ');
  if (combinedMsg.includes('timed out') || combinedMsg.includes('AbortError')) {
    throw new Error('Request timed out. Please check your connection and try again.');
  }
  if (combinedMsg.includes('Network request failed') || combinedMsg.includes('Failed to fetch')) {
    throw new Error('Network error. Please check your internet connection.');
  }

  throw new Error('Unable to get AI response. Please try again.');
}
