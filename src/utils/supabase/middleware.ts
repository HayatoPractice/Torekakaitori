import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseUrl = (url && url.startsWith('http')) ? url : 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 重要: この処理はセッションの有効期限を更新するために必要です
  // ユーザーの認証状態を検証します
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 保護されたルート（例：マイページや診断画面）へのアクセス制御ロジックを必要に応じてここに追加できます。
  // 今回は一旦、セッション更新のみ行い、ページ側でリダイレクト処理を行います。

  return supabaseResponse;
}
