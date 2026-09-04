import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getSql();
  const products = await sql`
    SELECT
      p.id, p.canonical_name, p.item_type, p.created_at, p.resale_notes, p.release_date::text AS release_date,
      p.secondary_market_price_individual, p.secondary_market_trend_individual,
      p.secondary_market_price_buyback_shrink, p.secondary_market_trend_buyback_shrink,
      p.secondary_market_price_buyback_noshrink, p.secondary_market_trend_buyback_noshrink,
      p.secondary_market_checked_at,
      (p.image_data IS NOT NULL) AS has_image,
      COALESCE(
        (SELECT json_agg(pa.* ORDER BY pa.created_at) FROM product_aliases pa WHERE pa.product_id = p.id),
        '[]'
      ) AS product_aliases
    FROM products p
    ORDER BY p.canonical_name
  `;
  return NextResponse.json({ products });
}
