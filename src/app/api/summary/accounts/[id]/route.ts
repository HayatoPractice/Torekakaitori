import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import type { ExtractedItem } from "@/types/domain";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

interface Aggregate {
  latest: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  count: number;
}

function aggregate(items: ExtractedItem[]): Aggregate {
  if (items.length === 0) return { latest: null, min: null, max: null, avg: null, count: 0 };
  const sorted = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const prices = items.map((i) => i.price);
  return {
    latest: sorted[0].price,
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
    count: items.length,
  };
}

/** GET /api/summary/accounts/[id] — アカウント別まとめ（商品ごとの販売⇔買取比較） */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sql = getSql();

  const accountRows = await sql`SELECT * FROM accounts WHERE id = ${id}`;
  if (accountRows.length === 0) return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
  const account = accountRows[0];

  const rows = await sql`
    SELECT
      ei.*,
      CASE WHEN pr.id IS NULL THEN NULL ELSE pr.canonical_name END AS product_canonical_name
    FROM extracted_items ei
    LEFT JOIN products pr ON pr.id = ei.product_id
    WHERE ei.account_id = ${id} AND ei.review_status != 'rejected'
  `;

  const byProduct = new Map<string, { name: string; sell: ExtractedItem[]; buy: ExtractedItem[] }>();
  for (const row of rows) {
    const item = row as unknown as ExtractedItem & { product_canonical_name: string | null };
    const key = (item.product_id as string | null) ?? item.product_name_raw;
    const name = item.product_canonical_name ?? item.product_name_raw;
    if (!byProduct.has(key)) byProduct.set(key, { name, sell: [], buy: [] });
    const bucket = byProduct.get(key)!;
    (item.price_type === "buy" ? bucket.buy : bucket.sell).push(item);
  }

  const products = Array.from(byProduct.entries()).map(([productId, bucket]) => {
    const sell = aggregate(bucket.sell);
    const buy = aggregate(bucket.buy);
    const spread = sell.latest !== null && buy.latest !== null ? sell.latest - buy.latest : null;
    return { product_id: productId, product_name: bucket.name, sell, buy, spread };
  });

  return NextResponse.json({ account, products });
}
