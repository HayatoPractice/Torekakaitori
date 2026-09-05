import { getSql } from "@/lib/db";
import { csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** GET /api/export/products-csv — 商品マスタ（1商品＝1行、発売日・再販メモ・2次流通を含む） */
export async function GET() {
  const sql = getSql();
  const rows = await sql`
    SELECT
      canonical_name, item_type, release_date::text AS release_date, resale_notes, retail_price,
      secondary_market_price_individual, secondary_market_trend_individual,
      secondary_market_price_buyback_shrink, secondary_market_trend_buyback_shrink,
      secondary_market_price_buyback_noshrink, secondary_market_trend_buyback_noshrink,
      secondary_market_checked_at::text AS secondary_market_checked_at
    FROM products
    ORDER BY canonical_name
  `;

  const header = [
    "商品名",
    "種別",
    "発売日",
    "定価",
    "再販メモ",
    "個人間の目安価格",
    "個人間の傾向メモ",
    "買取の目安価格（シュリンク有）",
    "買取の傾向メモ（シュリンク有）",
    "買取の目安価格（シュリンク無）",
    "買取の傾向メモ（シュリンク無）",
    "2次流通の最終調査日時",
  ];
  const csvRows = rows.map((row) => [
    row.canonical_name,
    row.item_type,
    row.release_date ?? "",
    row.retail_price ?? "",
    row.resale_notes ?? "",
    row.secondary_market_price_individual ?? "",
    row.secondary_market_trend_individual ?? "",
    row.secondary_market_price_buyback_shrink ?? "",
    row.secondary_market_trend_buyback_shrink ?? "",
    row.secondary_market_price_buyback_noshrink ?? "",
    row.secondary_market_trend_buyback_noshrink ?? "",
    row.secondary_market_checked_at ?? "",
  ]);

  return csvResponse(header, csvRows, "torecasouba_products.csv");
}
