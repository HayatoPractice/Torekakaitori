import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/summary/products/secondary-history?product_ids=id1,id2
 * 複数商品の2次流通価格の推移（secondary_market_history）をまとめて返す
 * （ホーム画面の「2次流通の比較」時系列グラフ用）
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const productIdsParam = params.get("product_ids");
  const productIds = productIdsParam ? productIdsParam.split(",").filter(Boolean) : [];

  if (productIds.length === 0) {
    return NextResponse.json({ rows: [] });
  }

  const sql = getSql();
  const rows = await sql`
    SELECT
      h.product_id,
      pr.canonical_name AS product_name,
      h.recorded_at::date::text AS date,
      h.price_individual,
      h.price_buyback_shrink,
      h.price_buyback_noshrink
    FROM secondary_market_history h
    JOIN products pr ON pr.id = h.product_id
    WHERE h.product_id = ANY(${productIds}::uuid[])
    ORDER BY h.recorded_at ASC
  `;

  return NextResponse.json({ rows });
}
