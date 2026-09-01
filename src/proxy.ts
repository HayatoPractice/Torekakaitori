import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Vercel Hobbyプランでは本番ドメイン自体をVercel Authenticationで保護できないため、
 * アプリ側でBasic認証をかけて非公開にする（BASIC_AUTH_PASSWORD未設定時は何もしない）。
 * ユーザー名・パスワードは環境変数固定（単一ユーザー運用のため、DBでの管理はしない）。
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function proxy(request: NextRequest): NextResponse {
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!password) return NextResponse.next();

  const user = process.env.BASIC_AUTH_USER || "torecasouba";
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    const inputUser = decoded.slice(0, separatorIndex);
    const inputPassword = decoded.slice(separatorIndex + 1);
    if (safeEqual(inputUser, user) && safeEqual(inputPassword, password)) {
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
