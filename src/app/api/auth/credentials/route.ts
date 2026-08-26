import { NextRequest, NextResponse } from "next/server";
import { updateOwnCredentials } from "@/lib/auth";
import { getRequestUser } from "@/lib/request-user";
import { isPgError, PG_UNIQUE_VIOLATION } from "@/lib/db";

export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;

/** PATCH /api/auth/credentials { username, password } — 自分のログイン用ユーザー名・パスワードを変更する */
export async function PATCH(req: NextRequest) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });

  const body = await req.json();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!username) {
    return NextResponse.json({ error: "ユーザー名を入力してください" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてください` }, { status: 400 });
  }

  try {
    await updateOwnCredentials(me.id, username, password);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isPgError(err, PG_UNIQUE_VIOLATION)) {
      return NextResponse.json({ error: `ユーザー名「${username}」は既に使われています` }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "変更に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
