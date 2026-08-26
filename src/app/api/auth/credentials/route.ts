import { NextRequest, NextResponse } from "next/server";
import { updateCredentials } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;

/** PATCH /api/auth/credentials { username, password } — ログイン用ユーザー名・パスワードを変更する */
export async function PATCH(req: NextRequest) {
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
    await updateCredentials(username, password);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "変更に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
