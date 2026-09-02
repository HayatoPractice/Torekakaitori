import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/** GET /api/scrape-import/[id] — レビュー画面（/post/bulk）が取り込み候補を読み出す */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sql = getSql();
  const rows = await sql`SELECT id, payload, created_at FROM scrape_batches WHERE id = ${id}`;
  if (rows.length === 0) {
    return NextResponse.json({ error: "取り込みデータが見つかりません（期限切れの可能性があります）" }, { status: 404 });
  }
  return NextResponse.json({ id: rows[0].id, payload: rows[0].payload, created_at: rows[0].created_at });
}

/** DELETE /api/scrape-import/[id] — レビュー完了後（取り込み後・キャンセル後）に一時データを消す */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sql = getSql();
  await sql`DELETE FROM scrape_batches WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
