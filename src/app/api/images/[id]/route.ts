import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/** GET /api/images/[id] — 投稿画像本体（bytea）を返す。閲覧権限があるアカウントの画像のみ */
export async function GET(req: NextRequest, { params }: Params) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });
  const { id } = await params;
  const sql = getSql();
  // encode(...,'hex')経由でテキストとして取り出し、JS側でBufferへ戻す（bytea直渡しの型差異を避けるため）
  const rows = await sql`
    SELECT encode(pi.data, 'hex') AS data_hex, pi.mime_type
    FROM post_images pi
    JOIN posts p ON p.id = pi.post_id
    JOIN accounts a ON a.id = p.account_id
    WHERE pi.id = ${id} AND (a.owner_user_id = ${me.id} OR a.is_shared = true)
  `;
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
