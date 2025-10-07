const VERCEL_API_BASE = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app';

const DEFAULT_TIMEOUT = 30000;

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(`${VERCEL_API_BASE}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        voice: params.voice || 'alloy',
      }),
      signal: controller.signal,
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
    
    if ((error as any)?.message?.includes('Network request failed')) {
      throw new Error('Cannot connect to server. Please check your internet connection and try again.');
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

    const response = await fetch(`${VERCEL_API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        messages: params.messages,
      }),
      signal: controller.signal,
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
    
    if ((error as any)?.message?.includes('Network request failed')) {
      throw new Error('Cannot connect to server. Please check your internet connection and try again.');
    }
    
    throw error;
  }
}
