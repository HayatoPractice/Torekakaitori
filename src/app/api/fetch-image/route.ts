import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 任意URLを取得できる公開プロキシにしない（SSRF対策）。Xの画像CDNだけを許可する */
const ALLOWED_HOSTS = [/(^|\.)twimg\.com$/];

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * GET /api/fetch-image?url=... — Xの画像CDN（pbs.twimg.com）のURLをサーバー側で取得し
 * base64へ変換して返す。ブラウザから直接fetchするとpbs.twimg.comがCORSヘッダーを
 * 返さず失敗するため、取り込み時（/post/bulk）はこのプロキシ経由で画像バイト列を得る
 */
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) return NextResponse.json({ error: "url は必須です" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "URLの形式が不正です" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.some((re) => re.test(parsed.hostname))) {
    return NextResponse.json({ error: "許可されていないホストです" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(parsed.toString());
  } catch {
    return NextResponse.json({ error: "画像の取得に失敗しました" }, { status: 502 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: `画像の取得に失敗しました（status: ${res.status}）` }, { status: 502 });
  }

  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  if (!mimeType.startsWith("image/")) {
    return NextResponse.json({ error: "画像以外のファイルは取得できません" }, { status: 400 });
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "画像サイズが大きすぎます" }, { status: 413 });
  }

  return NextResponse.json({ base64Data: buffer.toString("base64"), mimeType });
}
