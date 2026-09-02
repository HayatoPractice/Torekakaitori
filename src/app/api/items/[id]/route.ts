import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { parseBody } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

const patchItemSchema = z.object({
  price: z
    .number({ message: "価格は数値で指定してください" })
    .int("価格は整数で指定してください")
    .min(0, "価格は0以上にしてください")
    .optional(),
  product_name_raw: z
    .string({ message: "product_name_raw は文字列で指定してください" })
    .trim()
    .min(1, "product_name_raw は空にできません")
    .optional(),
  product_id: z
    .string({ message: "product_id は文字列で指定してください" })
    .uuid("product_id の形式が不正です")
    .optional(),
  price_type: z.enum(["sell", "buy"], { message: "price_type は sell か buy を指定してください" }).optional(),
  item_type: z
    .enum(["box", "pack", "other"], { message: "item_type は box・pack・other のいずれかを指定してください" })
    .optional(),
  review_status: z
    .enum(["confirmed", "pending_review", "rejected"], { message: "review_status の値が不正です" })
    .optional(),
});

/** レビューUIからの確認・修正・却下を受け付ける */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = parseBody(patchItemSchema, await req.json());
  if ("error" in parsed) return parsed.error;
  const { price, product_name_raw: productNameRaw, product_id: productId, price_type: priceType, item_type: itemType, review_status: reviewStatus } =
    parsed.data;

  const sql = getSql();
  const updated = await sql`
    UPDATE extracted_items ei SET
      price = COALESCE(${price ?? null}, ei.price),
      product_name_raw = COALESCE(${productNameRaw ?? null}, ei.product_name_raw),
      product_id = COALESCE(${productId ?? null}::uuid, ei.product_id),
      price_type = COALESCE(${priceType ?? null}, ei.price_type),
      item_type = COALESCE(${itemType ?? null}, ei.item_type),
      review_status = COALESCE(${reviewStatus ?? null}, ei.review_status)
    WHERE ei.id = ${id}
    RETURNING ei.*
  `;
  if (updated.length === 0) {
    return NextResponse.json({ error: "アイテムが見つかりません" }, { status: 404 });
  }
  return NextResponse.json({ item: updated[0] });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sql = getSql();
  await sql`DELETE FROM extracted_items WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
