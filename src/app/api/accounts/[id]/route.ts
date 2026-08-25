import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const sql = getSql();

  try {
    const handle = typeof body.handle === "string" ? body.handle.trim() : null;
    const displayName = typeof body.display_name === "string" ? body.display_name.trim() : null;
    const hasNotes = "notes" in body;
    const notes = hasNotes ? (body.notes ? String(body.notes).trim() : null) : null;

    const updated = await sql`
      UPDATE accounts SET
        handle = COALESCE(${handle}, handle),
        display_name = COALESCE(${displayName}, display_name),
        notes = CASE WHEN ${hasNotes} THEN ${notes} ELSE notes END
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

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sql = getSql();
  await sql`DELETE FROM accounts WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
