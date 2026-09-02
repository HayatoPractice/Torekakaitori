import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { ingestPost } from "@/lib/ingest";
import { optionalText, parseBody, requiredText } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Gemini解析（複数画像含む）に時間がかかる場合があるため

const imageSchema = z.object({
  base64Data: z.string({ message: "base64Data は文字列で指定してください" }).min(1, "base64Data は必須です"),
  mimeType: z.string({ message: "mimeType は文字列で指定してください" }).min(1, "mimeType は必須です"),
  fileName: z.string().optional(),
});

const createPostSchema = z
  .object({
    account_id: requiredText("account_id は必須です"),
    posted_date: requiredText("posted_date は必須です"),
    source_url: optionalText,
    raw_text: z.string({ message: "raw_text は文字列で指定してください" }).nullable().optional(),
    images: z.array(imageSchema, { message: "images の形式が不正です" }).optional().default([]),
  })
  .refine((data) => !!(data.source_url || data.raw_text?.trim() || data.images.length > 0), {
    message: "URL・テキスト・画像のいずれかを入力してください",
  });

export async function POST(req: NextRequest) {
  const parsed = parseBody(createPostSchema, await req.json());
  if ("error" in parsed) return parsed.error;
  const { account_id: accountId, posted_date: postedDate, source_url: sourceUrl, raw_text: rawText, images } = parsed.data;

  const sql = getSql();
  const exists = await sql`SELECT 1 FROM accounts WHERE id = ${accountId}`;
  if (exists.length === 0) {
    return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });
  }

  try {
    const result = await ingestPost({ accountId, postedDate, sourceUrl, rawText: rawText ?? null, images });
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
 * account_ids未指定なら全アカウント対象。
 */
export async function GET(req: NextRequest) {
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
      AND (${accountIds}::uuid[] IS NULL OR p.account_id = ANY(${accountIds}::uuid[]))
    ORDER BY p.created_at DESC
  `;
  return NextResponse.json({ posts });
}
