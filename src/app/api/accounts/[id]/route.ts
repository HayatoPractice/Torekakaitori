import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { parseBody } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

const patchAccountSchema = z.object({
  handle: z.string({ message: "handle は文字列で指定してください" }).trim().min(1, "handle は空にできません").optional(),
  display_name: z
    .string({ message: "display_name は文字列で指定してください" })
    .trim()
    .min(1, "display_name は空にできません")
    .optional(),
  notes: z.string({ message: "notes は文字列で指定してください" }).nullable().optional(),
  url: z.string({ message: "url は文字列で指定してください" }).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const parsed = parseBody(patchAccountSchema, body);
  if ("error" in parsed) return parsed.error;
  const { handle, display_name } = parsed.data;

  // notes/urlは「キー自体が無い＝変更しない」「null/空文字＝クリアする」を区別する必要があるため、
  // パース済みの値だけでなく元のbodyにキーがあるかも見る
  const hasNotes = "notes" in body;
  const notes = hasNotes ? parsed.data.notes?.trim() || null : null;
  const hasUrl = "url" in body;
  const url = hasUrl ? parsed.data.url?.trim() || null : null;

  const sql = getSql();
  try {
    const updated = await sql`
      UPDATE accounts SET
        handle = COALESCE(${handle}, handle),
        display_name = COALESCE(${display_name}, display_name),
        notes = CASE WHEN ${hasNotes} THEN ${notes} ELSE notes END,
        url = CASE WHEN ${hasUrl} THEN ${url} ELSE url END
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
  const { id } = await params;
  const sql = getSql();
  await sql`DELETE FROM accounts WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
