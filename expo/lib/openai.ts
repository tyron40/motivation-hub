import { generateTextToSpeech as generateTTS } from './api-client';

export async function generateTextToSpeech(params: {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}): Promise<string> {
  try {
    console.log('🎤 [OpenAI] Generating TTS...');
    console.log('🎤 [OpenAI] Text length:', params.text.length);
    console.log('🎤 [OpenAI] Voice:', params.voice || 'alloy');

    const result = await generateTTS({
      text: params.text,
      voice: params.voice || 'alloy',
    });

    console.log('✅ [OpenAI] TTS result received');

    if (!result.audio || !result.audio.base64Data) {
      throw new Error('Invalid TTS response: missing audio data');
    }

    const audioUrl = `data:${result.audio.mimeType};base64,${result.audio.base64Data}`;
    console.log('✅ [OpenAI] Audio URL created, length:', audioUrl.length);
    
    return audioUrl;
  } catch (error) {
    console.error('❌ [OpenAI] TTS generation failed:', error);
    throw error;
  }
}
