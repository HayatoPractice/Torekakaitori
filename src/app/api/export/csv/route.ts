import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** GET /api/export/csv?date=...&account_id=...&product_id=... （フィルタは任意） */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const date = params.get("date");
  const accountId = params.get("account_id");
  const productId = params.get("product_id");

  const sql = getSql();
  const rows = await sql`
    SELECT
      p.posted_date::text AS posted_date, a.display_name AS account_name, ei.product_name_raw,
      pr.canonical_name, ei.item_type, ei.price_type, ei.price, ei.confidence,
      ei.review_status, p.source_url
    FROM extracted_items ei
    JOIN posts p ON p.id = ei.post_id
    JOIN accounts a ON a.id = ei.account_id
    LEFT JOIN products pr ON pr.id = ei.product_id
    WHERE (${date}::date IS NULL OR p.posted_date = ${date}::date)
      AND (${accountId}::uuid IS NULL OR ei.account_id = ${accountId}::uuid)
      AND (${productId}::uuid IS NULL OR ei.product_id = ${productId}::uuid)
    ORDER BY ei.created_at DESC
    LIMIT 5000
  `;

  const header = ["投稿日", "アカウント", "商品名", "種別", "価格区分", "価格", "確信度", "レビュー状態", "投稿URL"];
  const csvRows = rows.map((row) => [
    row.posted_date,
    row.account_name,
    row.canonical_name ?? row.product_name_raw,
    row.item_type,
    row.price_type === "buy" ? "買取" : "販売",
    row.price,
    row.confidence,
    row.review_status,
    row.source_url ?? "",
  ]);

  const csv = [header, ...csvRows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const withBom = "﻿" + csv; // Excelでの文字化け防止

  return new NextResponse(withBom, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="torecasouba_export.csv"`,
    },
  });
}
