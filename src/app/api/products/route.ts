import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getSql();
  const products = await sql`
    SELECT
      p.id, p.canonical_name, p.item_type, p.created_at, p.resale_notes,
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
