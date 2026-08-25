import { getSql } from "@/lib/db";

/** Postgresの特殊文字をエスケープしてからilikeの完全一致（大文字小文字無視）に使う */
function escapeForIlike(value: string): string {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`);
}

/**
 * 商品名から正規化済みのproduct_idを引く。
 * alias→canonical_nameの順で完全一致（大文字小文字無視）を探し、無ければ新規productを作る。
 * 商品数が増えても1件ずつの検索で済むよう、テーブル全件は取得しない。
 */
export async function findOrCreateProduct(rawName: string, itemType: string): Promise<string> {
  const sql = getSql();
  const trimmed = rawName.trim();
  const pattern = escapeForIlike(trimmed);

  const aliasRows = await sql`SELECT product_id FROM product_aliases WHERE alias_text ILIKE ${pattern} LIMIT 1`;
  if (aliasRows.length > 0) return aliasRows[0].product_id as string;

  const productRows = await sql`SELECT id FROM products WHERE canonical_name ILIKE ${pattern} LIMIT 1`;
  if (productRows.length > 0) return productRows[0].id as string;

  const created = await sql`
    INSERT INTO products (canonical_name, item_type) VALUES (${trimmed}, ${itemType}) RETURNING id
  `;
  return created[0].id as string;
}

/** 商品を統合する。fromProductId配下のitems/aliasesをintoProductIdへ付け替えて、fromを削除する */
export async function mergeProducts(fromProductId: string, intoProductId: string): Promise<void> {
  if (fromProductId === intoProductId) return;
  const sql = getSql();

  await sql`UPDATE extracted_items SET product_id = ${intoProductId} WHERE product_id = ${fromProductId}`;
  await sql`UPDATE product_aliases SET product_id = ${intoProductId} WHERE product_id = ${fromProductId}`;

  const fromRows = await sql`SELECT canonical_name FROM products WHERE id = ${fromProductId}`;
  if (fromRows.length > 0) {
    await sql`
      INSERT INTO product_aliases (product_id, alias_text)
      VALUES (${intoProductId}, ${fromRows[0].canonical_name})
      ON CONFLICT (alias_text) DO UPDATE SET product_id = EXCLUDED.product_id
    `;
  }

  await sql`DELETE FROM products WHERE id = ${fromProductId}`;
}
