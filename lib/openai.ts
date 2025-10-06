const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function generateChatCompletion(params: {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
}): Promise<string> {
  try {
    console.log('🤖 Calling OpenAI Chat API directly');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured in .env file');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: params.messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const completion = data.choices?.[0]?.message?.content;
    
    if (!completion || typeof completion !== 'string') {
      throw new Error('Invalid response format from OpenAI API');
    }
    
    console.log('✅ Chat completion received, length:', completion.length);
    return completion;
  } catch (error: any) {
    console.error('❌ Error in generateChatCompletion:', error);
    console.error('❌ Error name:', error?.name);
    console.error('❌ Error message:', error?.message);
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
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured in .env file');
    }
    
    console.log('📤 Calling OpenAI TTS API directly...');
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: params.text,
        voice: params.voice || 'alloy',
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI TTS API error:', response.status, errorText);
      throw new Error(`OpenAI TTS API error: ${response.status}`);
    }
    
    console.log('✅ TTS response received, converting to blob...');
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    
    console.log('✅ Creating object URL from blob...');
    const audioUrl = URL.createObjectURL(blob);
    
    console.log('✅ TTS audio generated successfully');
    return audioUrl;
  } catch (error: any) {
    console.error('❌ Error in generateTextToSpeech:', error);
    console.error('❌ Error name:', error?.name);
    console.error('❌ Error message:', error?.message);
    throw error;
  }
}
