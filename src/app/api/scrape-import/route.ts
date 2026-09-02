import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * このルートだけはX（x.com/twitter.com）のページ上で動くブックマークレットから
 * 直接fetchされる想定のため、他のAPIと違ってCORSを許可する必要がある
 * （ブラウザがクロスオリジンPOST前にOPTIONSプリフライトを送るので両方に付与する）。
 * このアプリ自体が無認証で公開されているため、CORSを開けても保護レベルは変わらない。
 * エラー応答にもCORSヘッダーが無いとブラウザ側でエラーメッセージを読めなくなるため、
 * 共通のparseBodyヘルパーは使わずこのファイル内で個別にヘッダーを付与している。
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const scrapeItemSchema = z.object({
  text: z.string().optional().default(""),
  url: z.string().optional().default(""),
  postedDate: z.string().nullable().optional().default(null),
  imageUrls: z.array(z.string()).optional().default([]),
});

const scrapeImportSchema = z.object({
  source: z.string().optional().default(""),
  items: z.array(scrapeItemSchema).optional().default([]),
});

/**
 * POST /api/scrape-import { source, items } — ブックマークレットがXのタイムラインから
 * 一括収集した投稿を一時保存する。実際の登録（AI解析・重複判定）はまだ行わず、
 * レビュー画面（/post/bulk）でユーザーが選んでから /api/posts を個別に呼ぶ
 */
export async function POST(req: NextRequest) {
  const parsed = scrapeImportSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "取り込みデータの形式が不正です" }, { status: 400, headers: CORS_HEADERS });
  }
  const { source, items: rawItems } = parsed.data;

  const items = rawItems
    .map((item) => ({ text: item.text.trim(), url: item.url.trim(), postedDate: item.postedDate, imageUrls: item.imageUrls }))
    // テキストも画像も無い（＝リツイートの引用元が読めなかった等）ものは取り込む意味が無い
    .filter((item) => item.text || item.imageUrls.length > 0)
    .slice(0, 30); // 一度に開きすぎたタイムラインで暴走しないよう上限を設ける

  if (items.length === 0) {
    return NextResponse.json({ error: "取り込める投稿が見つかりませんでした" }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const sql = getSql();
    // 専用のcronは持たないため、新規作成のたびに古い（レビューされず放置された）バッチを
    // ついでに掃除する「使うときに掃除する」方式にしている
    await sql`DELETE FROM scrape_batches WHERE created_at < now() - interval '1 day'`;
    const inserted = await sql`
      INSERT INTO scrape_batches (payload) VALUES (${JSON.stringify({ source, items })}) RETURNING id
    `;
    return NextResponse.json({ id: inserted[0].id }, { status: 201, headers: CORS_HEADERS });
  } catch {
    // ここでcatchせずに例外を投げたままにすると、CORSヘッダーの無い素のエラー応答になり
    // ブラウザ側（Xのページで動くブックマークレット）からエラー内容を一切読めなくなる（INC-052と同種）
    return NextResponse.json({ error: "取り込みデータの保存に失敗しました" }, { status: 500, headers: CORS_HEADERS });
  }
}
