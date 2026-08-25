import { NextRequest, NextResponse } from "next/server";
import { mergeProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

/** POST /api/products/merge { from_product_id, into_product_id } — 表記ゆれの統合 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const fromId = String(body.from_product_id ?? "");
  const intoId = String(body.into_product_id ?? "");
  if (!fromId || !intoId) {
    return NextResponse.json({ error: "from_product_id と into_product_id は必須です" }, { status: 400 });
  }

  try {
    await mergeProducts(fromId, intoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "統合に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
