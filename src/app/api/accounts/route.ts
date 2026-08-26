import { NextRequest, NextResponse } from "next/server";
import { getSql, isPgError, PG_UNIQUE_VIOLATION } from "@/lib/db";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

/** 自分が登録した、または共有設定になっているアカウントのみ返す */
export async function GET(req: NextRequest) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });

  const sql = getSql();
  const accounts = await sql`
    SELECT a.*, (a.owner_user_id = ${me.id}) AS is_mine
    FROM accounts a
    WHERE a.owner_user_id = ${me.id} OR a.is_shared = true
    ORDER BY a.display_name
  `;
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });

  const body = await req.json();
  const handle = String(body.handle ?? "").trim();
  const displayName = String(body.display_name ?? "").trim();
  const notes = body.notes ? String(body.notes).trim() : null;

  if (!handle || !displayName) {
    return NextResponse.json({ error: "handle と display_name は必須です" }, { status: 400 });
  }

  const sql = getSql();
  try {
    const created = await sql`
      INSERT INTO accounts (handle, display_name, notes, owner_user_id)
      VALUES (${handle}, ${displayName}, ${notes}, ${me.id})
      RETURNING *
    `;
    return NextResponse.json({ account: created[0] }, { status: 201 });
  } catch (err) {
    if (isPgError(err, PG_UNIQUE_VIOLATION)) {
      return NextResponse.json({ error: `アカウント「${handle}」は既に登録されています` }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "登録に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
