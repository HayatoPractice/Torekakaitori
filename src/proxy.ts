import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCredentials, verifyPassword } from "@/lib/auth";

// Proxyは常にNode.jsランタイムで動く（Route segment configのruntime指定は不可・エラーになる）

/**
 * Vercel Hobbyプランでは本番ドメイン自体をVercel Authenticationで保護できないため、
 * アプリ側でBasic認証をかけて非公開にする。認証情報はDB優先・未設定時は環境変数
 * （BASIC_AUTH_USER/BASIC_AUTH_PASSWORD）にフォールバックする。どちらも無ければ無防備。
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const creds = await getCredentials();
  if (!creds) return NextResponse.next();

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    const inputUser = decoded.slice(0, separatorIndex);
    const inputPassword = decoded.slice(separatorIndex + 1);
    if (inputUser === creds.username && verifyPassword(inputPassword, creds)) {
      return NextResponse.next();
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
