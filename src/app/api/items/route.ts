import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

/**
 * GET /api/items?date=YYYY-MM-DD&account_ids=id1,id2&product_id=...&review_status=...&price_type=...
 * すべて任意フィルタ（未指定なら条件を無視）。閲覧可能（自分の登録 or 共有）なアカウントの
 * アイテムのみ返す。指定なしなら閲覧可能な全件（新しい順、最大2000件）。
 */
export async function GET(req: NextRequest) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const date = params.get("date");
  const accountIdsParam = params.get("account_ids");
  const accountIds = accountIdsParam ? accountIdsParam.split(",").filter(Boolean) : null;
  const productId = params.get("product_id");
  const reviewStatus = params.get("review_status");
  const priceType = params.get("price_type");

  const sql = getSql();
  const items = await sql`
    SELECT
      ei.*,
      json_build_object('handle', a.handle, 'display_name', a.display_name) AS accounts,
      json_build_object('posted_date', p.posted_date::text, 'source_url', p.source_url) AS posts,
      CASE WHEN pr.id IS NULL THEN NULL ELSE json_build_object('canonical_name', pr.canonical_name) END AS products
    FROM extracted_items ei
    JOIN posts p ON p.id = ei.post_id
    JOIN accounts a ON a.id = ei.account_id
    LEFT JOIN products pr ON pr.id = ei.product_id
    WHERE (a.owner_user_id = ${me.id} OR a.is_shared = true)
      AND (${date}::date IS NULL OR p.posted_date = ${date}::date)
      AND (${accountIds}::uuid[] IS NULL OR ei.account_id = ANY(${accountIds}::uuid[]))
      AND (${productId}::uuid IS NULL OR ei.product_id = ${productId}::uuid)
      AND (${reviewStatus}::text IS NULL OR ei.review_status = ${reviewStatus}::text)
      AND (${priceType}::text IS NULL OR ei.price_type = ${priceType}::text)
    ORDER BY ei.created_at DESC
    LIMIT 2000
  `;
  return NextResponse.json({ items });
}
