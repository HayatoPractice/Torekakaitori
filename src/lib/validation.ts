import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * APIルートの入力検証を共通化する。schemaに合わなければ最初のエラーメッセージを
 * そのまま400で返す。各フィールドのバリデーションには必ず日本語メッセージを渡すこと
 * （zodの既定メッセージは英語のため、そのまま返すと画面に英語が出てしまう）
 */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): { data: T } | { error: NextResponse } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "入力内容が不正です";
    return { error: NextResponse.json({ error: message }, { status: 400 }) };
  }
  return { data: parsed.data };
}

/** 必須の文字列。未指定・null・空文字・空白のみをすべて同じメッセージで弾く */
export function requiredText(message: string) {
  return z.preprocess(
    (v) => (typeof v === "string" ? v : v == null ? "" : v),
    z.string().trim().min(1, message)
  );
}

/** 任意の文字列。未指定・null・空文字・空白のみはすべてnullに正規化する */
export const optionalText = z
  .string({ message: "文字列で指定してください" })
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));
