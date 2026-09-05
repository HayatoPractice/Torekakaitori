import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";

/**
 * このテストプロセス専用の一意な接頭辞。
 * 本番の実データがこの文字列を含むことは無いという前提のもと、
 * 作成したテストデータの識別・掃除に使う。
 */
export const TEST_PREFIX = `__vitest_${randomUUID().slice(0, 8)}__`;

export function prefixed(name: string): string {
  return `${TEST_PREFIX}${name}`;
}

/**
 * このテストが作った行だけを削除する（本番データには絶対に触れない）。
 *
 * accounts.handle / posts.source_url / products.canonical_name / product_aliases.alias_text
 * のいずれかに必ずTEST_PREFIXを含めることをテスト側の規約とし、
 * その目印に一致する行だけをLIKE検索で辿って削除する。
 * TEST_PREFIXはrandomUUID由来で本番データと衝突しないため、
 * 一致しない行（＝本番の実データ）は一切削除対象にならない。
 */
export async function cleanupTestData(): Promise<void> {
  const sql = getSql();
  const like = `${TEST_PREFIX}%`;

  // extracted_items は post_id/account_id/product_id のいずれか経由でテストデータに
  // 紐づいていれば削除対象（product_name_raw自体はエスケープ確認テストで任意の文字列を
  // 入れるためprefixを付けない場合があり、判定に使わない）
  await sql`
    DELETE FROM extracted_items
    WHERE account_id IN (SELECT id FROM accounts WHERE handle LIKE ${like})
       OR post_id IN (SELECT id FROM posts WHERE source_url LIKE ${like})
       OR product_id IN (SELECT id FROM products WHERE canonical_name LIKE ${like})
  `;
  await sql`DELETE FROM posts WHERE source_url LIKE ${like}`;
  await sql`DELETE FROM posts WHERE account_id IN (SELECT id FROM accounts WHERE handle LIKE ${like})`;
  await sql`DELETE FROM product_aliases WHERE alias_text LIKE ${like}`;
  await sql`DELETE FROM products WHERE canonical_name LIKE ${like}`;
  await sql`DELETE FROM accounts WHERE handle LIKE ${like}`;
}
