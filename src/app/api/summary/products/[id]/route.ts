import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/** GET /api/summary/products/[id] — 商品の価格推移＋店舗別ランキング（閲覧可能なアカウント分のみ） */
export async function GET(req: NextRequest, { params }: Params) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });
  const { id } = await params;
  const sql = getSql();

  const productRows = await sql`SELECT * FROM products WHERE id = ${id}`;
  if (productRows.length === 0) return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
  const product = productRows[0];

  const rows = await sql`
    SELECT ei.id, ei.price, ei.price_type, ei.created_at, a.handle AS account_handle, a.display_name AS account_display_name,
           p.posted_date::text AS posted_date
    FROM extracted_items ei
    JOIN posts p ON p.id = ei.post_id
    JOIN accounts a ON a.id = ei.account_id
    WHERE ei.product_id = ${id} AND ei.review_status != 'rejected'
      AND (a.owner_user_id = ${me.id} OR a.is_shared = true)
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
