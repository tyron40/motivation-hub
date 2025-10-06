import { trpcClient } from '@/lib/trpc';

export async function generateChatCompletion(params: {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
}): Promise<string> {
  try {
    console.log('🤖 Calling backend chat API via tRPC');
    console.log('🔍 Backend URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);
    
    if (!process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
      throw new Error('Backend URL not configured. EXPO_PUBLIC_RORK_API_BASE_URL is not set.');
    }
    
    const result = await trpcClient.chat.mutate({
      messages: params.messages,
    });
    
    if (!result.completion || typeof result.completion !== 'string') {
      throw new Error('Invalid response format from chat API');
    }
    
    console.log('✅ Chat completion received, length:', result.completion.length);
    return result.completion;
  } catch (error: any) {
    console.error('❌ Error in generateChatCompletion:', error);
    console.error('❌ Error name:', error?.name);
    console.error('❌ Error message:', error?.message);
    
    if (error?.message?.includes('Backend URL not configured')) {
      throw new Error('Backend is not running. Please start the backend server.');
    }
    
    if (error?.message?.includes('Network request failed') || error?.name === 'TypeError') {
      throw new Error('Cannot connect to backend. Please ensure the backend server is running.');
    }
    
    throw error;
  }
}

export async function generateTextToSpeech(params: {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}): Promise<string> {
  try {
    console.log('🎤 Generating TTS for text:', params.text.substring(0, 50) + '...');
    console.log('🔊 Voice:', params.voice || 'alloy');
    
    console.log('📤 Calling backend TTS API via tRPC...');
    console.log('🔍 Backend URL:', process.env.EXPO_PUBLIC_RORK_API_BASE_URL);
    
    if (!process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
      throw new Error('Backend URL not configured. EXPO_PUBLIC_RORK_API_BASE_URL is not set.');
    }
    
    const result = await trpcClient.tts.mutate({
      text: params.text,
      voice: params.voice || 'alloy',
    });
    
    if (!result.audio || !result.audio.base64Data) {
      throw new Error('Invalid response format from TTS API');
    }
    
    console.log('✅ Converting base64 to blob...');
    const base64Data = result.audio.base64Data;
    const mimeType = result.audio.mimeType || 'audio/mpeg';
    
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    console.log('✅ Creating object URL from blob...');
    const audioUrl = URL.createObjectURL(blob);
    
    console.log('✅ TTS audio generated successfully');
    return audioUrl;
  } catch (error: any) {
    console.error('❌ Error in generateTextToSpeech:', error);
    console.error('❌ Error name:', error?.name);
    console.error('❌ Error message:', error?.message);
    console.error('❌ Error cause:', error?.cause);
    
    if (error?.message?.includes('Backend URL not configured')) {
      throw new Error('Backend is not running. Please start the backend server.');
    }
    
    if (error?.message?.includes('Network request failed') || error?.name === 'TypeError') {
      throw new Error('Cannot connect to backend. Please ensure the backend server is running.');
    }
    
    throw error;
  }
}
