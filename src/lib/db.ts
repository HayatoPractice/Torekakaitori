import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * 認証なし・単一ユーザー運用のため、サーバー側APIルートからのみ呼び出す。
 * DATABASE_URLの読み込みは初回呼び出し時まで遅延させる（importだけでビルドが
 * 落ちないようにするため。env未設定時は呼び出し時に分かりやすいエラーを出す）。
 */
let cached: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("環境変数 DATABASE_URL が設定されていません。.env.local を確認してください。");
  }
  cached = neon(url);
  return cached;
}

/** Postgresのunique_violationエラーコード */
export const PG_UNIQUE_VIOLATION = "23505";

export function isPgError(err: unknown, code: string): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === code;
}
