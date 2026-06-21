import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createMockSupabaseClient } from './mockClient';

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isPlaceholder = !url || url.includes('placeholder') || !url.startsWith('http');

  if (isPlaceholder) {
    return createMockSupabaseClient();
  }

  const cookieStore = await cookies();
  const supabaseUrl = url;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// サービスロール（管理者権限）クライアントを作成する関数
// セキュリティ上、この関数はサーバーサイド（Route HandlersやServer Actions）のみで使用してください
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isPlaceholder = !url || url.includes('placeholder') || !url.startsWith('http');

  if (isPlaceholder) {
    return createMockSupabaseClient();
  }

  const supabaseUrl = url;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

  return createServerClient(
    supabaseUrl,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // 管理者クライアントではCookieの書き込みを行わない
        },
      },
    }
  );
}
