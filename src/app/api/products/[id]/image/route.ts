import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { parseBody } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/** GET /api/products/[id]/image — 商品の代表画像（bytea）を返す */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sql = getSql();
  // encode(...,'hex')経由でテキストとして取り出し、JS側でBufferへ戻す（bytea直渡しの型差異を避けるため）
  const rows = await sql`
    SELECT encode(image_data, 'hex') AS data_hex, image_mime_type
    FROM products
    WHERE id = ${id} AND image_data IS NOT NULL
  `;
  if (rows.length === 0) return NextResponse.json({ error: "画像が登録されていません" }, { status: 404 });

  const buffer = Buffer.from(rows[0].data_hex as string, "hex");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": rows[0].image_mime_type as string,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

const uploadSchema = z.object({
  base64Data: z.string({ message: "base64Data は文字列で指定してください" }).min(1, "base64Data は必須です"),
  mimeType: z.string({ message: "mimeType は文字列で指定してください" }).min(1, "mimeType は必須です"),
});

/** POST /api/products/[id]/image { base64Data, mimeType } — 商品の代表画像を登録・差し替える */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = parseBody(uploadSchema, await req.json());
  if ("error" in parsed) return parsed.error;
  const { base64Data, mimeType } = parsed.data;

  const sql = getSql();
  const hex = Buffer.from(base64Data, "base64").toString("hex");
  const updated = await sql`
    UPDATE products SET image_data = decode(${hex}, 'hex'), image_mime_type = ${mimeType}
    WHERE id = ${id}
    RETURNING id
  `;
  if (updated.length === 0) return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/products/[id]/image — 商品の代表画像を削除する */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sql = getSql();
  await sql`UPDATE products SET image_data = NULL, image_mime_type = NULL WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
