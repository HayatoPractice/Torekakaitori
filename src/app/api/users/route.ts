import { NextRequest, NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/auth";
import { getRequestUser } from "@/lib/request-user";
import { isPgError, PG_UNIQUE_VIOLATION } from "@/lib/db";

export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;

/** GET /api/users — ユーザー一覧（管理者のみ） */
export async function GET(req: NextRequest) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });
  if (!me.isAdmin) return NextResponse.json({ error: "管理者のみ利用できます" }, { status: 403 });

  const users = await listUsers();
  return NextResponse.json({ users });
}

/** POST /api/users { username, password, is_admin } — ユーザー追加（管理者のみ） */
export async function POST(req: NextRequest) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });
  if (!me.isAdmin) return NextResponse.json({ error: "管理者のみ利用できます" }, { status: 403 });

  const body = await req.json();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const isAdmin = body.is_admin === true;

  if (!username) return NextResponse.json({ error: "ユーザー名を入力してください" }, { status: 400 });
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてください` }, { status: 400 });
  }

  try {
    const user = await createUser(username, password, isAdmin);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (isPgError(err, PG_UNIQUE_VIOLATION)) {
      return NextResponse.json({ error: `ユーザー名「${username}」は既に使われています` }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "追加に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
