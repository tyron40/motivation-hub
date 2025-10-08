export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  console.log('[Health] Direct health check endpoint hit');
  console.log('[Health] Request URL:', req.url);
  console.log('[Health] Request method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '600',
      },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      env: {
        hasSupabaseUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'no-cache',
      },
    }
  );
}
