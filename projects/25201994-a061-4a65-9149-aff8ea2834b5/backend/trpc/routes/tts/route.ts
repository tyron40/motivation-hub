import { z } from 'zod';
import { publicProcedure } from '../../init';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const ttsProcedure = publicProcedure
  .input(
    z.object({
      text: z.string(),
      voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
    })
  )
  .mutation(async ({ input }) => {
    console.log('🎤 TTS request:', { text: input.text.substring(0, 50), voice: input.voice });

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    try {
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: input.voice,
        input: input.text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      const base64Audio = buffer.toString('base64');

      console.log('✅ TTS generated successfully');

      return {
        audio: `data:audio/mp3;base64,${base64Audio}`,
      };
    } catch (error) {
      console.error('❌ TTS error:', error);
      throw new Error(`TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
