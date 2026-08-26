import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

async function canManage(sql: ReturnType<typeof getSql>, accountId: string, userId: string, isAdmin: boolean) {
  if (isAdmin) return true;
  const rows = await sql`SELECT owner_user_id FROM accounts WHERE id = ${accountId}`;
  return rows.length > 0 && rows[0].owner_user_id === userId;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });
  const { id } = await params;
  const sql = getSql();

  if (!(await canManage(sql, id, me.id, me.isAdmin))) {
    return NextResponse.json({ error: "このアカウントを変更する権限がありません" }, { status: 403 });
  }

  const body = await req.json();
  const handle = typeof body.handle === "string" ? body.handle.trim() : null;
  const displayName = typeof body.display_name === "string" ? body.display_name.trim() : null;
  const hasNotes = "notes" in body;
  const notes = hasNotes ? (body.notes ? String(body.notes).trim() : null) : null;
  const hasIsShared = typeof body.is_shared === "boolean";
  const isShared = hasIsShared ? body.is_shared : null;

  try {
    const updated = await sql`
      UPDATE accounts SET
        handle = COALESCE(${handle}, handle),
        display_name = COALESCE(${displayName}, display_name),
        notes = CASE WHEN ${hasNotes} THEN ${notes} ELSE notes END,
        is_shared = CASE WHEN ${hasIsShared} THEN ${isShared} ELSE is_shared END
      WHERE id = ${id}
      RETURNING *
    `;
    if (updated.length === 0) return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
    return NextResponse.json({ account: updated[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "更新に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });
  const { id } = await params;
  const sql = getSql();

  if (!(await canManage(sql, id, me.id, me.isAdmin))) {
    return NextResponse.json({ error: "このアカウントを削除する権限がありません" }, { status: 403 });
  }

  await sql`DELETE FROM accounts WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
