import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

const ITEM_TYPES = new Set(["box", "pack", "other"]);
const PRICE_TYPES = new Set(["sell", "buy"]);
const REVIEW_STATUSES = new Set(["confirmed", "pending_review", "rejected"]);

/** レビューUIからの確認・修正・却下を受け付ける */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const price = typeof body.price === "number" ? Math.round(body.price) : null;
  const productNameRaw = typeof body.product_name_raw === "string" ? body.product_name_raw.trim() : null;
  const productId = typeof body.product_id === "string" ? body.product_id : null;
  const priceType = PRICE_TYPES.has(body.price_type) ? (body.price_type as string) : null;
  const itemType = ITEM_TYPES.has(body.item_type) ? (body.item_type as string) : null;
  const reviewStatus = REVIEW_STATUSES.has(body.review_status) ? (body.review_status as string) : null;

  const sql = getSql();
  const updated = await sql`
    UPDATE extracted_items SET
      price = COALESCE(${price}, price),
      product_name_raw = COALESCE(${productNameRaw}, product_name_raw),
      product_id = COALESCE(${productId}::uuid, product_id),
      price_type = COALESCE(${priceType}, price_type),
      item_type = COALESCE(${itemType}, item_type),
      review_status = COALESCE(${reviewStatus}, review_status)
    WHERE id = ${id}
    RETURNING *
  `;
  if (updated.length === 0) return NextResponse.json({ error: "アイテムが見つかりません" }, { status: 404 });
  return NextResponse.json({ item: updated[0] });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sql = getSql();
  await sql`DELETE FROM extracted_items WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
