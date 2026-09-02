import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * このルートだけはX（x.com/twitter.com）のページ上で動くブックマークレットから
 * 直接fetchされる想定のため、他のAPIと違ってCORSを許可する必要がある
 * （ブラウザがクロスオリジンPOST前にOPTIONSプリフライトを送るので両方に付与する）。
 * このアプリ自体が無認証で公開されているため、CORSを開けても保護レベルは変わらない。
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

interface IncomingItem {
  text: string;
  url: string;
  postedDate: string | null;
  imageUrls: string[];
}

/**
 * POST /api/scrape-import { source, items } — ブックマークレットがXのタイムラインから
 * 一括収集した投稿を一時保存する。実際の登録（AI解析・重複判定）はまだ行わず、
 * レビュー画面（/post/bulk）でユーザーが選んでから /api/posts を個別に呼ぶ
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const source = typeof body.source === "string" ? body.source : "";
  const rawItems: unknown[] = Array.isArray(body.items) ? body.items : [];

  const items: IncomingItem[] = rawItems
    .map((raw) => {
      const r = raw as Record<string, unknown>;
      const text = typeof r.text === "string" ? r.text.trim() : "";
      const url = typeof r.url === "string" ? r.url.trim() : "";
      const postedDate = typeof r.postedDate === "string" ? r.postedDate : null;
      const imageUrls = Array.isArray(r.imageUrls) ? r.imageUrls.filter((u): u is string => typeof u === "string") : [];
      return { text, url, postedDate, imageUrls };
    })
    // テキストも画像も無い（＝リツイートの引用元が読めなかった等）ものは取り込む意味が無い
    .filter((item) => item.text || item.imageUrls.length > 0)
    .slice(0, 30); // 一度に開きすぎたタイムラインで暴走しないよう上限を設ける

  if (items.length === 0) {
    return NextResponse.json({ error: "取り込める投稿が見つかりませんでした" }, { status: 400, headers: CORS_HEADERS });
  }

  const sql = getSql();
  const inserted = await sql`
    INSERT INTO scrape_batches (payload) VALUES (${JSON.stringify({ source, items })}) RETURNING id
  `;

  return NextResponse.json({ id: inserted[0].id }, { status: 201, headers: CORS_HEADERS });
}
