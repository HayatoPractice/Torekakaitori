import { getSql, isPgError, PG_UNIQUE_VIOLATION } from "@/lib/db";
import { analyzeCombined } from "@/lib/gemini";
import { computeContentHash } from "@/lib/hash";
import { findOrCreateProduct } from "@/lib/products";
import type { ExtractedItem, Post } from "@/types/domain";

/** これ以上の確信度なら自動確定、未満なら要確認（pending_review）にする */
const CONFIDENCE_AUTO_CONFIRM_THRESHOLD = 0.75;

/**
 * postsのdate型カラムはNeonドライバがJSのDateとして返し、JSON化すると
 * タイムゾーンの影響でズレたISO日時文字列になる（例: 2026-08-26 → "2026-08-25T15:00:00.000Z"）。
 * SELECT/RETURNINGでは必ずこのリストを使い、posted_dateをtextにキャストしてから受け取ること。
 */
const POST_COLUMNS = `id, account_id, posted_date::text as posted_date, source_url, raw_text, content_hash, status, error_message, created_at`;

export interface IngestInput {
  accountId: string;
  postedDate: string; // YYYY-MM-DD
  sourceUrl?: string | null;
  rawText?: string | null;
  images?: Array<{ base64Data: string; mimeType: string; fileName?: string }>;
}

export interface IngestResult {
  post: Post;
  items: ExtractedItem[];
  duplicateOf?: string; // 既存postのid（重複判定時のみ）
}

export async function ingestPost(input: IngestInput): Promise<IngestResult> {
  const sql = getSql();
  const images = input.images ?? [];
  const rawText = input.rawText?.trim() || null;
  const sourceUrl = input.sourceUrl?.trim() || null;

  const imageBuffers = images.map((img) => Buffer.from(img.base64Data, "base64"));
  const contentHash = computeContentHash(rawText, imageBuffers);

  // URLが無いテキスト/画像投稿は、内容の完全一致で重複を検知する
  if (!sourceUrl) {
    const existing = await sql`SELECT ${sql.unsafe(POST_COLUMNS)} FROM posts WHERE content_hash = ${contentHash} LIMIT 1`;
    if (existing.length > 0) {
      return { post: existing[0] as unknown as Post, items: [], duplicateOf: existing[0].id as string };
    }
  }

  let post: Post;
  try {
    const inserted = await sql`
      INSERT INTO posts (account_id, posted_date, source_url, raw_text, content_hash, status)
      VALUES (${input.accountId}, ${input.postedDate}, ${sourceUrl}, ${rawText}, ${contentHash}, 'pending')
      RETURNING ${sql.unsafe(POST_COLUMNS)}
    `;
    post = inserted[0] as unknown as Post;
  } catch (err) {
    if (isPgError(err, PG_UNIQUE_VIOLATION)) {
      const existing = await sql`SELECT ${sql.unsafe(POST_COLUMNS)} FROM posts WHERE source_url = ${sourceUrl} LIMIT 1`;
      return { post: existing[0] as unknown as Post, items: [], duplicateOf: existing[0]?.id as string };
    }
    throw new Error(`投稿の登録に失敗しました: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  // 画像をDBへ保存（bytea）。16進テキスト経由で確実にエンコードする。
  for (const [i, img] of images.entries()) {
    const hex = imageBuffers[i].toString("hex");
    await sql`
      INSERT INTO post_images (post_id, data, mime_type)
      VALUES (${post.id}, decode(${hex}, 'hex'), ${img.mimeType})
    `;
  }

  try {
    const analyzed = await analyzeCombined(
      rawText,
      images.map((img) => ({ base64Data: img.base64Data, mimeType: img.mimeType }))
    );

    const items: ExtractedItem[] = [];
    for (const item of analyzed) {
      const productId = await findOrCreateProduct(item.product_name_raw, item.item_type);
      const reviewStatus = item.confidence >= CONFIDENCE_AUTO_CONFIRM_THRESHOLD ? "confirmed" : "pending_review";
      const insertedItem = await sql`
        INSERT INTO extracted_items
          (post_id, account_id, product_id, product_name_raw, item_type, price_type, price, confidence, review_status)
        VALUES
          (${post.id}, ${input.accountId}, ${productId}, ${item.product_name_raw}, ${item.item_type},
           ${item.price_type}, ${item.price}, ${item.confidence}, ${reviewStatus})
        RETURNING *
      `;
      items.push(insertedItem[0] as unknown as ExtractedItem);
    }

    await sql`UPDATE posts SET status = 'processed' WHERE id = ${post.id}`;
    return { post: { ...post, status: "processed" }, items };
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI解析中に不明なエラーが発生しました";
    await sql`UPDATE posts SET status = 'error', error_message = ${message} WHERE id = ${post.id}`;
    return { post: { ...post, status: "error", error_message: message }, items: [] };
  }
}
