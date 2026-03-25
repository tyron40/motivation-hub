import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vncaboqllcykibwdnmwp.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuY2Fib3FsbGN5a2lid2RubXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzAzNTgsImV4cCI6MjA3NDMwNjM1OH0.QbPby5rAKpStXuXE9safH5bQy3VzmFg16nWJHCX9tnA';

export const supabaseBackend = createClient(supabaseUrl, supabaseAnonKey);

export async function getOpenAIKey(): Promise<string> {
  try {
    const { data, error } = await supabaseBackend
      .from('secrets')
      .select('value')
      .eq('key', 'OPENAI_API_KEY')
      .single();

    if (error) {
      console.error('❌ Error fetching OpenAI key from Supabase:', error);
      const envKey = process.env.OPENAI_API_KEY;
      if (envKey) {
        console.log('⚠️ Falling back to environment variable');
        return envKey;
      }
      throw new Error('OpenAI API key not found in Supabase or environment');
    }

    if (!data?.value) {
      throw new Error('OpenAI API key value is empty');
    }

    console.log('✅ OpenAI API key fetched from Supabase');
    return data.value;
  } catch (error) {
    console.error('❌ Error in getOpenAIKey:', error);
    const envKey = process.env.OPENAI_API_KEY;
    if (envKey) {
      console.log('⚠️ Falling back to environment variable');
      return envKey;
    }
    throw error;
  }
}
