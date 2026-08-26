import { NextRequest, NextResponse } from "next/server";
import { getUserById } from "@/lib/auth";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

/** GET /api/auth/me — 現在ログイン中のユーザー情報 */
export async function GET(req: NextRequest) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });
  const user = await getUserById(me.id);
  if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
  return NextResponse.json({ user });
}
