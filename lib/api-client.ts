const VERCEL_API_BASE = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'https://motivation-hub-git-main-tyrons-projects-584a5697.vercel.app';

export async function generateTextToSpeech(params: {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}): Promise<{ audio: { base64Data: string; mimeType: string } }> {
  try {
    console.log('🎤 Generating TTS via Vercel API...');
    console.log('🎤 Text length:', params.text.length);
    console.log('🎤 Voice:', params.voice || 'alloy');

    const response = await fetch(`${VERCEL_API_BASE}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        voice: params.voice || 'alloy',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ TTS API error:', response.status, errorText);
      throw new Error(`TTS API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ TTS result received');

    if (!result.audio || !result.audio.base64Data) {
      throw new Error('Invalid TTS response: missing audio data');
    }

    return result;
  } catch (error) {
    console.error('❌ TTS generation failed:', error);
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

    const response = await fetch(`${VERCEL_API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: params.messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Chat API error:', response.status, errorText);
      throw new Error(`Chat API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Chat response received');

    if (!result.message || typeof result.message !== 'string') {
      throw new Error('Invalid chat response format');
    }

    return result;
  } catch (error) {
    console.error('❌ Chat request failed:', error);
    throw error;
  }
}
