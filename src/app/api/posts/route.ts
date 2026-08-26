import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { ingestPost } from "@/lib/ingest";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Gemini解析（複数画像含む）に時間がかかる場合があるため

interface IncomingImage {
  base64Data: string;
  mimeType: string;
  fileName?: string;
}

export async function POST(req: NextRequest) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });

  const body = await req.json();
  const accountId = String(body.account_id ?? "");
  const postedDate = String(body.posted_date ?? "");
  const sourceUrl = body.source_url ? String(body.source_url).trim() : null;
  const rawText = body.raw_text ? String(body.raw_text) : null;
  const images: IncomingImage[] = Array.isArray(body.images) ? body.images : [];

  if (!accountId || !postedDate) {
    return NextResponse.json({ error: "account_id と posted_date は必須です" }, { status: 400 });
  }
  if (!sourceUrl && !rawText?.trim() && images.length === 0) {
    return NextResponse.json({ error: "URL・テキスト・画像のいずれかを入力してください" }, { status: 400 });
  }

  const sql = getSql();
  const visible = await sql`
    SELECT 1 FROM accounts WHERE id = ${accountId} AND (owner_user_id = ${me.id} OR is_shared = true)
  `;
  if (visible.length === 0) {
    return NextResponse.json({ error: "このアカウントに投稿する権限がありません" }, { status: 403 });
  }

  try {
    const result = await ingestPost({ accountId, postedDate, sourceUrl, rawText, images });
    if (result.duplicateOf) {
      return NextResponse.json(
        { post: result.post, items: result.items, duplicate: true, message: "同一の投稿が既に登録されています" },
        { status: 200 }
      );
    }
    return NextResponse.json({ post: result.post, items: result.items, duplicate: false }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "投稿の登録に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/posts?date=YYYY-MM-DD[&account_ids=id1,id2,...] — その日の投稿を横断参照
 * account_ids未指定なら閲覧可能な全アカウント対象。閲覧権限（自分の登録 or 共有）の
 * 無いアカウントは指定してもフィルタから除外される。
 */
export async function GET(req: NextRequest) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date");
  const accountIdsParam = req.nextUrl.searchParams.get("account_ids");
  const accountIds = accountIdsParam ? accountIdsParam.split(",").filter(Boolean) : null;
  if (!date) return NextResponse.json({ error: "date は必須です" }, { status: 400 });

  const sql = getSql();
  const posts = await sql`
    SELECT
      p.id, p.account_id, p.posted_date::text AS posted_date, p.source_url, p.raw_text,
      p.content_hash, p.status, p.error_message, p.created_at,
      json_build_object('handle', a.handle, 'display_name', a.display_name) AS accounts,
      COALESCE(
        (SELECT json_agg(json_build_object('id', pi.id, 'post_id', pi.post_id, 'mime_type', pi.mime_type, 'created_at', pi.created_at))
         FROM post_images pi WHERE pi.post_id = p.id),
        '[]'
      ) AS post_images,
      COALESCE(
        (SELECT json_agg(ei.* ORDER BY ei.created_at) FROM extracted_items ei WHERE ei.post_id = p.id),
        '[]'
      ) AS extracted_items
    FROM posts p
    JOIN accounts a ON a.id = p.account_id
    WHERE p.posted_date = ${date}
      AND (a.owner_user_id = ${me.id} OR a.is_shared = true)
      AND (${accountIds}::uuid[] IS NULL OR p.account_id = ANY(${accountIds}::uuid[]))
    ORDER BY p.created_at DESC
  `;
  return NextResponse.json({ posts });
}
