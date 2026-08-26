import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";

/**
 * 全リクエストをBasic認証で保護する（Vercel Hobbyプランでは本番ドメインをVercel
 * Authenticationで保護できないため）。認証できたユーザーのid/管理者フラグを
 * x-user-id / x-is-admin ヘッダーに詰めてAPIルートへ渡す（クライアントからの
 * 偽装ヘッダーは常に上書きするので信頼してよい）。
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    const inputUser = decoded.slice(0, separatorIndex);
    const inputPassword = decoded.slice(separatorIndex + 1);

    const user = await authenticate(inputUser, inputPassword);
    if (user) {
      const headers = new Headers(request.headers);
      headers.set("x-user-id", user.id);
      headers.set("x-is-admin", user.is_admin ? "true" : "false");
      return NextResponse.next({ request: { headers } });
    }
  }

  return new NextResponse("認証が必要です", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="torecasouba"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
