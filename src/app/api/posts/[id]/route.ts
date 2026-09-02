import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { parseBody, requiredText } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

const patchPostSchema = z.object({
  account_id: requiredText("account_id は必須です"),
});

/**
 * PATCH /api/posts/[id] { account_id } — 投稿の対象アカウントを登録し直す
 * （登録時にアカウントを選び間違えた場合の訂正用）。extracted_items.account_id は
 * 集計クエリ高速化のための非正規化列なので、posts側と一緒に更新して同期を保つ。
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = parseBody(patchPostSchema, await req.json());
  if ("error" in parsed) return parsed.error;
  const { account_id: accountId } = parsed.data;

  const sql = getSql();
  const accountExists = await sql`SELECT 1 FROM accounts WHERE id = ${accountId}`;
  if (accountExists.length === 0) {
    return NextResponse.json({ error: "指定されたアカウントが見つかりません" }, { status: 404 });
  }

  const updated = await sql`
    UPDATE posts SET account_id = ${accountId} WHERE id = ${id} RETURNING id
  `;
  if (updated.length === 0) {
    return NextResponse.json({ error: "投稿が見つかりません" }, { status: 404 });
  }

  await sql`UPDATE extracted_items SET account_id = ${accountId} WHERE post_id = ${id}`;

  return NextResponse.json({ ok: true });
}
