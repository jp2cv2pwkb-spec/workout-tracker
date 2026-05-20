import { createClient } from '@supabase/supabase-js';
 
// Lazy-initialize so the build doesn't fail when env vars are missing.
// (They exist at runtime in Vercel; this just delays client creation.)
let _client = null;
 
export const supabase = new Proxy({}, {
  get(_target, prop) {
    if (!_client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        // Return a no-op during prerender so the build doesn't crash
        if (typeof window === 'undefined') {
          return () => {};
        }
        throw new Error(
          'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel.'
        );
      }
      _client = createClient(url, key);
    }
    return _client[prop];
  },
});
