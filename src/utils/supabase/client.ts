import { createBrowserClient } from '@supabase/ssr';
import { createMockSupabaseClient } from './mockClient';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isPlaceholder = !url || url.includes('placeholder') || !url.startsWith('http');

  if (isPlaceholder) {
    return createMockSupabaseClient();
  }

  const supabaseUrl = url;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
}
