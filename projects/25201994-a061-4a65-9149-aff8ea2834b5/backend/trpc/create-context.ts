import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { createClient } from '../lib/supabase';

export async function createContext(opts: FetchCreateContextFnOptions) {
  const authHeader = opts.req.headers.get('authorization');
  const supabase = createClient();

  let user = null;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data } = await supabase.auth.getUser(token);
    user = data.user;
  }

  return {
    user,
    supabase,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
