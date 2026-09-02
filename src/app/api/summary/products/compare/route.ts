import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/summary/products/compare?product_ids=id1,id2&granularity=day|year&price_type=sell|buy
 * 複数商品の価格推移を、指定した粒度（日単位/年単位）で平均して比較する
 * （ホーム画面の商品トレンド棒グラフ用）
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const productIdsParam = params.get("product_ids");
  const productIds = productIdsParam ? productIdsParam.split(",").filter(Boolean) : [];
  const granularity = params.get("granularity") === "year" ? "year" : "day";
  const priceType = params.get("price_type") === "buy" ? "buy" : "sell";

  if (productIds.length === 0) {
    return NextResponse.json({ rows: [] });
  }

  const sql = getSql();
  const rows = await sql`
    SELECT
      ei.product_id,
      pr.canonical_name AS product_name,
      CASE WHEN ${granularity} = 'year' THEN to_char(p.posted_date, 'YYYY') ELSE p.posted_date::text END AS bucket,
      AVG(ei.price)::int AS avg_price,
      COUNT(*)::int AS sample_count
    FROM extracted_items ei
    JOIN posts p ON p.id = ei.post_id
    JOIN products pr ON pr.id = ei.product_id
    WHERE ei.product_id = ANY(${productIds}::uuid[])
      AND ei.review_status != 'rejected'
      AND ei.price_type = ${priceType}
    GROUP BY ei.product_id, pr.canonical_name, bucket
    ORDER BY bucket ASC
  `;

  return NextResponse.json({ rows });
}
