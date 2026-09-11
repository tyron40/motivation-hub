import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Backend Supabase] Missing env vars:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
  });
} else {
  console.log('[Backend Supabase] Initialized with Rork env vars');
}

export const supabaseBackend = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Server-only privileged client.
// NEVER expose SUPABASE_SERVICE_ROLE_KEY through EXPO_PUBLIC_* variables.
export const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

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
