import { Platform } from 'react-native';

const SUPABASE_URL = 'https://vncaboqllcykibwdnmwp.supabase.co';

export async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection...');
  console.log('Platform:', Platform.OS);
  console.log('URL:', SUPABASE_URL);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });
    
    console.log('✅ Supabase Connection Status:', response.status);
    console.log('Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
    
    if (response.status === 200) {
      console.log('✅ Supabase is reachable');
      return true;
    } else {
      console.log('⚠️ Supabase returned status:', response.status);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Supabase Connection Error:', error);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      cause: error?.cause,
    });
    return false;
  }
}
