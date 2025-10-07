import { trpcClient } from './trpc';

export async function generateTextToSpeech(params: {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}): Promise<string> {
  try {
    console.log('🎤 [OpenAI] Generating TTS via tRPC...');
    console.log('🎤 [OpenAI] Text length:', params.text.length);
    console.log('🎤 [OpenAI] Voice:', params.voice || 'alloy');

    const result = await trpcClient.tts.synthesize.mutate({
      text: params.text,
      voice: params.voice || 'alloy',
    });

    console.log('✅ [OpenAI] TTS result received');
    console.log('📦 [OpenAI] Result structure:', {
      hasAudio: !!result.audio,
      hasMimeType: !!result.audio?.mimeType,
      hasBase64Data: !!result.audio?.base64Data,
      base64Length: result.audio?.base64Data?.length || 0,
    });

    if (!result.audio || !result.audio.base64Data) {
      throw new Error('Invalid TTS response: missing audio data');
    }

    const audioUrl = `data:${result.audio.mimeType};base64,${result.audio.base64Data}`;
    console.log('✅ [OpenAI] Audio URL created, length:', audioUrl.length);
    
    return audioUrl;
  } catch (error) {
    console.error('❌ [OpenAI] TTS generation failed:', error);
    console.error('❌ [OpenAI] Error type:', error?.constructor?.name);
    console.error('❌ [OpenAI] Error message:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
