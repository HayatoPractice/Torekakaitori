import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mergeProducts } from "@/lib/products";
import { parseBody, requiredText } from "@/lib/validation";

export const dynamic = "force-dynamic";

const mergeSchema = z.object({
  from_product_id: requiredText("from_product_id は必須です"),
  into_product_id: requiredText("into_product_id は必須です"),
});

/** POST /api/products/merge { from_product_id, into_product_id } — 表記ゆれの統合 */
export async function POST(req: NextRequest) {
  const parsed = parseBody(mergeSchema, await req.json());
  if ("error" in parsed) return parsed.error;
  const { from_product_id: fromId, into_product_id: intoId } = parsed.data;

  try {
    await mergeProducts(fromId, intoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "統合に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
