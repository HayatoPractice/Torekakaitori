import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { createServerClient } from '@supabase/ssr';

// 認証が必須なルート（未ログイン時は /auth へリダイレクト）
const PROTECTED_ROUTES = ['/', '/history', '/knowledge/submit', '/diagnoses'];

export async function middleware(request: NextRequest) {
  // まずセッションを更新する（Supabase SSR の必須処理）
  const response = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  // 保護対象ルートかチェック
  const isProtected = PROTECTED_ROUTES.some(route =>
    route === '/' ? pathname === '/' : pathname.startsWith(route)
  );

  if (isProtected) {
    // サーバー側でセッションを確認
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // 未ログインはエッジで即座に /auth へリダイレクト（ページが表示されない）
      const redirectUrl = new URL('/auth', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 次で始まるパスを除くすべてのリクエストパスにマッチします：
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル)
     * - favicon.ico (ファビコンファイル)
     * - 以下の画像やアセットなどの拡張子：
     *   - svg, png, jpg, jpeg, gif, webp
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
