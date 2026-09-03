import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSql, isPgError, PG_UNIQUE_VIOLATION } from "@/lib/db";
import { parseBody } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

const patchProductSchema = z.object({
  canonical_name: z
    .string({ message: "canonical_name は文字列で指定してください" })
    .trim()
    .min(1, "canonical_name は空にできません")
    .optional(),
  resale_notes: z.string({ message: "resale_notes は文字列で指定してください" }).nullable().optional(),
});

/** PATCH /api/products/[id] { canonical_name?, resale_notes? } — 商品名・再販履歴メモを編集する */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const parsed = parseBody(patchProductSchema, body);
  if ("error" in parsed) return parsed.error;
  const { canonical_name: canonicalName } = parsed.data;

  // resale_notesは「キー自体が無い＝変更しない」「null/空文字＝クリアする」を区別する必要があるため、
  // パース済みの値だけでなく元のbodyにキーがあるかも見る（accounts PATCHと同じパターン）
  const hasResaleNotes = "resale_notes" in body;
  const resaleNotes = hasResaleNotes ? parsed.data.resale_notes?.trim() || null : null;

  const sql = getSql();
  try {
    const updated = await sql`
      UPDATE products SET
        canonical_name = COALESCE(${canonicalName ?? null}, canonical_name),
        resale_notes = CASE WHEN ${hasResaleNotes} THEN ${resaleNotes} ELSE resale_notes END
      WHERE id = ${id}
      RETURNING *
    `;
    if (updated.length === 0) return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
    return NextResponse.json({ product: updated[0] });
  } catch (err) {
    if (isPgError(err, PG_UNIQUE_VIOLATION)) {
      return NextResponse.json({ error: `商品名「${canonicalName}」は既に登録されています` }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "更新に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
