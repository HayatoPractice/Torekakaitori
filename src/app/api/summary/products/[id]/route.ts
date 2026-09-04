import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/** GET /api/summary/products/[id] — 商品の価格推移＋店舗別ランキング */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sql = getSql();

  const productRows = await sql`
    SELECT id, canonical_name, item_type, created_at, resale_notes, release_date::text AS release_date,
      secondary_market_price_individual, secondary_market_trend_individual,
      secondary_market_price_buyback_shrink, secondary_market_trend_buyback_shrink,
      secondary_market_price_buyback_noshrink, secondary_market_trend_buyback_noshrink,
      secondary_market_checked_at,
      (image_data IS NOT NULL) AS has_image
    FROM products WHERE id = ${id}
  `;
  if (productRows.length === 0) return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
  const product = productRows[0];

  const rows = await sql`
    SELECT ei.id, ei.price, ei.price_type, ei.created_at, a.handle AS account_handle, a.display_name AS account_display_name,
           p.posted_date::text AS posted_date
    FROM extracted_items ei
    JOIN posts p ON p.id = ei.post_id
    JOIN accounts a ON a.id = ei.account_id
    WHERE ei.product_id = ${id} AND ei.review_status != 'rejected'
    ORDER BY ei.created_at ASC
  `;

  type Row = {
    price: number;
    price_type: "sell" | "buy";
    created_at: string;
    account_handle: string;
    account_display_name: string;
    posted_date: string;
  };
  const typedRows = rows as unknown as Row[];

  const trend = typedRows.map((r) => ({
    date: r.posted_date,
    price: r.price,
    price_type: r.price_type,
    account: r.account_display_name,
  }));

  // 店舗ごとの最新価格でランキング（昇順ソート済みなので最後に残るのが最新）
  const latestByAccountAndType = new Map<string, Row>();
  for (const r of typedRows) {
    latestByAccountAndType.set(`${r.account_handle}__${r.price_type}`, r);
  }
  const ranking = Array.from(latestByAccountAndType.values()).map((r) => ({
    account: r.account_display_name,
    price_type: r.price_type,
    price: r.price,
  }));
  ranking.sort((a, b) => (a.price_type === b.price_type ? a.price - b.price : 0));

  return NextResponse.json({ product, trend, ranking });
}
