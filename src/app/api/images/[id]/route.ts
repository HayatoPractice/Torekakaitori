import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/** GET /api/images/[id] — 投稿画像本体（bytea）を返す */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const sql = getSql();
  // encode(...,'hex')経由でテキストとして取り出し、JS側でBufferへ戻す（bytea直渡しの型差異を避けるため）
  const rows = await sql`SELECT encode(data, 'hex') AS data_hex, mime_type FROM post_images WHERE id = ${id}`;
  if (rows.length === 0) return NextResponse.json({ error: "画像が見つかりません" }, { status: 404 });

  const buffer = Buffer.from(rows[0].data_hex as string, "hex");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": rows[0].mime_type as string,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
