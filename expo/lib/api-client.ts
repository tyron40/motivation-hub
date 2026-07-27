import { Platform } from 'react-native';
import { API_ENDPOINTS, getBackendUrl } from './config';

console.log('🔧 API Client initialized | Platform:', Platform.OS, '| Using OpenAI via backend');

const CHAT_TIMEOUT = 60000;
const TTS_TIMEOUT = 30000;
const STT_TIMEOUT = 30000;
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

export async function transcribeAudio(params: {
  audio: FormData;
}): Promise<{ text: string }> {
  try {
    const backendUrl = getBackendUrl();
    const sttUrl = API_ENDPOINTS.stt;
    console.log('🎯 Transcribing audio via Vercel API...');
    console.log('🎯 API Base URL:', backendUrl);
    console.log('🎯 Full URL:', sttUrl);

    const response = await fetchWithTimeout(
      sttUrl,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: params.audio,
      },
      STT_TIMEOUT
    );

    const contentType = response.headers.get('content-type') || '';
    console.log('📡 STT response content-type:', contentType);
    console.log('📡 STT response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('❌ STT API error response:', errorText.substring(0, 200));

      if (response.status === 401 || response.status === 403) {
        throw new Error('Unauthorized/Forbidden from backend. Verify deployment protection/auth headers.');
      }

      throw new Error(`STT API error: ${response.status} ${errorText.substring(0, 120)}`);
    }

    const responseText = await response.text();
    if (!contentType.includes('application/json')) {
      throw new Error(`Expected JSON response but got ${contentType || 'unknown content type'}`);
    }

    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(`Invalid JSON response from STT API: ${responseText.substring(0, 100)}`);
    }

    if (!result?.text || typeof result.text !== 'string') {
      throw new Error('Invalid STT response format');
    }

    return { text: result.text };
  } catch (error: any) {
    console.error('❌ STT request failed:', error);
    if (error?.name === 'AbortError') {
      throw new Error('Request timeout - please check your internet connection');
    }
    if (error?.message?.includes('Network request failed') || error?.message?.includes('Failed to fetch')) {
      const backendUrl = getBackendUrl();
      throw new Error(
        `Cannot connect to server at ${backendUrl}. Check internet, deployment status, and /api/health availability.`
      );
    }
    throw error;
  }
}

const extractTextDeep = (value: any): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractTextDeep(item);
      if (nested) return nested;
    }
    return '';
  }

  if (typeof value === 'object') {
    const directKeys = ['text', 'content', 'message', 'output_text', 'response'];
    for (const key of directKeys) {
      const nested = extractTextDeep((value as any)[key]);
      if (nested) return nested;
    }

    const commonNestedPaths = [
      (value as any)?.choices?.[0]?.message?.content,
      (value as any)?.choices?.[0]?.delta?.content,
      (value as any)?.data?.message,
      (value as any)?.data?.content,
      (value as any)?.data?.result,
      (value as any)?.result?.message,
      (value as any)?.result?.content,
      (value as any)?.output?.[0]?.content?.[0]?.text,
    ];

    for (const candidate of commonNestedPaths) {
      const nested = extractTextDeep(candidate);
      if (nested) return nested;
    }
  }

  try {
    const asString = String(value).trim();
    return asString === '[object Object]' ? '' : asString;
  } catch {
    return '';
  }
};

const normalizeVisibleText = (value: string): string =>
  (value || '').replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim();

const extractAssistantText = (rawResult: any): { text: string; source: string } => {
  const candidates: Array<{ source: string; value: any }> = [
    { source: 'message', value: rawResult?.message },
    { source: 'text', value: rawResult?.text },
    { source: 'response', value: rawResult?.response },
    { source: 'data.message', value: rawResult?.data?.message },
    { source: 'data.result', value: rawResult?.data?.result },
    { source: 'choices[0].message.content', value: rawResult?.choices?.[0]?.message?.content },
    { source: 'choices[0].delta.content', value: rawResult?.choices?.[0]?.delta?.content },
    { source: 'output_text', value: rawResult?.output_text },
    { source: 'output[0].content[0].text', value: rawResult?.output?.[0]?.content?.[0]?.text },
    { source: 'content', value: rawResult?.content },
    { source: 'root', value: rawResult },
  ];

  for (const candidate of candidates) {
    const text = extractTextDeep(candidate.value);
    if (text) return { text, source: candidate.source };
  }

  return { text: '', source: 'none' };
};

export async function sendChatMessage(params: {
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
}): Promise<{ message: string }> {
  console.log('🤖 sendChatMessage | Platform:', Platform.OS, '| messages:', params.messages.length);
  console.log('🤖 Backend URL:', API_ENDPOINTS.chat);

  const response = await fetchWithRetry(
    API_ENDPOINTS.chat,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ messages: params.messages }),
    },
    3,
    CHAT_TIMEOUT
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const contentType = response.headers.get('content-type') || '';
    console.error('❌ Chat error:', {
      status: response.status,
      contentType,
      bodyPreview: errorText.substring(0, 300),
      endpoint: API_ENDPOINTS.chat,
      platform: Platform.OS,
    });
    throw new Error(`Chat request failed: ${response.status} ${errorText.substring(0, 120)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const responseText = await response.text();

  if (!responseText || responseText.trim().length === 0) {
    throw new Error('Empty chat response body');
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch (parseErr) {
    console.error('❌ Chat response parse error:', responseText.substring(0, 200));
    throw new Error('Invalid JSON in chat response');
  }

  const extracted = extractAssistantText(data);
  const message = normalizeVisibleText(extracted.text);

  if (!message) {
    console.error('❌ Chat empty message, full response:', JSON.stringify(data).substring(0, 300));
    throw new Error('Backend returned empty message');
  }

  console.log('✅ Chat completed via backend OpenAI | length:', message.length, '| source:', extracted.source);
  return { message };
}

export async function transcribeAudioViaBackend(audioUri: string): Promise<string> {
  console.log('🎯 STT | Transcribing audio via backend OpenAI Whisper');
  console.log('📁 Audio URI:', audioUri);

  const formData = new FormData();
  const uriParts = audioUri.split('.');
  const fileType = uriParts[uriParts.length - 1];

  const mimeType = fileType === 'wav' ? 'audio/wav' :
                   fileType === 'm4a' ? 'audio/mp4' :
                   fileType === 'webm' ? 'audio/webm' :
                   `audio/${fileType}`;

  if (Platform.OS === 'web') {
    const response = await fetch(audioUri);
    const blob = await response.blob();
    formData.append('audio', blob, `recording.${fileType}`);
  } else {
    const audioFile = {
      uri: audioUri,
      name: `recording.${fileType}`,
      type: mimeType,
    } as any;
    formData.append('audio', audioFile);
  }

  console.log('📤 Sending audio to backend STT endpoint...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('⏱️ STT request timeout after 30 seconds');
    controller.abort();
  }, STT_TIMEOUT);

  try {
    const response = await fetch(API_ENDPOINTS.stt, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📡 STT response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('❌ STT error:', response.status, errorText.substring(0, 200));
      throw new Error(`STT failed (${response.status}): ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    console.log('✅ STT transcription received');

    if (data.text && data.text.trim()) {
      return data.text.trim();
    }

    throw new Error('Empty transcription result');
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      throw new Error('Transcription timed out. Please try again.');
    }
    throw error;
  }
}

export async function generateImageViaBackend(prompt: string, size: string = '1024x1024'): Promise<{ imageUrl: string }> {
  console.log('🎨 Image generation | prompt length:', prompt.length);

  const response = await fetchWithTimeout(
    API_ENDPOINTS.imageGenerate,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ prompt, size }),
    },
    60000
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('❌ Image generation error:', response.status, errorText.substring(0, 200));
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ Image generated successfully');

  if (!data?.imageUrl) {
    throw new Error('Invalid image generation response');
  }

  return { imageUrl: data.imageUrl };
}
