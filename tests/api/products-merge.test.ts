import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getSql } from "@/lib/db";
import { mergeProducts } from "@/lib/products";
import { POST } from "@/app/api/products/merge/route";
import { cleanupTestData, prefixed } from "../helpers";

const sql = getSql();

async function createAccount(name: string): Promise<string> {
  const rows = await sql`
    INSERT INTO accounts (handle, display_name) VALUES (${prefixed(name)}, ${prefixed(name)}) RETURNING id
  `;
  return rows[0].id as string;
}

async function createPost(accountId: string, name: string): Promise<string> {
  const rows = await sql`
    INSERT INTO posts (account_id, posted_date, source_url)
    VALUES (${accountId}, '2024-01-01', ${prefixed(name)})
    RETURNING id
  `;
  return rows[0].id as string;
}

async function createProduct(name: string): Promise<string> {
  const rows = await sql`
    INSERT INTO products (canonical_name, item_type) VALUES (${prefixed(name)}, 'box') RETURNING id
  `;
  return rows[0].id as string;
}

describe("mergeProducts / POST /api/products/merge", () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  it("統合元のextracted_items/product_aliasesが統合先へ引き継がれ、統合元が削除され、統合元の商品名がaliasとして残る", async () => {
    const intoId = await createProduct("統合先商品");
    const fromId = await createProduct("統合元商品");
    const accountId = await createAccount("acct-merge");
    const postId = await createPost(accountId, "post-merge");

    const itemRows = await sql`
      INSERT INTO extracted_items (post_id, account_id, product_id, product_name_raw, item_type, price_type, price, confidence)
      VALUES (${postId}, ${accountId}, ${fromId}, ${prefixed("統合元商品")}, 'box', 'sell', 3000, 0.9)
      RETURNING id
    `;
    const itemId = itemRows[0].id as string;

    await sql`
      INSERT INTO product_aliases (product_id, alias_text) VALUES (${fromId}, ${prefixed("既存エイリアス")})
    `;

    await mergeProducts(fromId, intoId);

    // extracted_itemsの付け替え
    const item = await sql`SELECT product_id FROM extracted_items WHERE id = ${itemId}`;
    expect(item[0].product_id).toBe(intoId);

    // 既存aliasの付け替え＋統合元の商品名がaliasとして残る
    const aliases = await sql`
      SELECT alias_text FROM product_aliases WHERE product_id = ${intoId} ORDER BY alias_text
    `;
    const aliasTexts = aliases.map((a) => a.alias_text as string);
    expect(aliasTexts).toContain(prefixed("既存エイリアス"));
    expect(aliasTexts).toContain(prefixed("統合元商品"));

    // 統合元productは削除される
    const fromProduct = await sql`SELECT id FROM products WHERE id = ${fromId}`;
    expect(fromProduct.length).toBe(0);
  });

  it("同じID同士のmergeは何もしない（早期return）", async () => {
    const id = await createProduct("自己統合商品");
    await mergeProducts(id, id);
    const rows = await sql`SELECT id FROM products WHERE id = ${id}`;
    expect(rows.length).toBe(1);
  });

  it("POST /api/products/merge はルート経由でも統合できる", async () => {
    const intoId = await createProduct("ルート統合先");
    const fromId = await createProduct("ルート統合元");
    const req = new NextRequest("http://localhost/api/products/merge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from_product_id: fromId, into_product_id: intoId }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    const fromProduct = await sql`SELECT id FROM products WHERE id = ${fromId}`;
    expect(fromProduct.length).toBe(0);
    const aliases = await sql`SELECT alias_text FROM product_aliases WHERE product_id = ${intoId}`;
    expect(aliases.map((a) => a.alias_text as string)).toContain(prefixed("ルート統合元"));
  });

  it("from_product_id が無いと400を返す", async () => {
    const intoId = await createProduct("400確認用統合先");
    const req = new NextRequest("http://localhost/api/products/merge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ into_product_id: intoId }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
