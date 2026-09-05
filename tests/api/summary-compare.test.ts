import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getSql } from "@/lib/db";
import { GET } from "@/app/api/summary/products/compare/route";
import { cleanupTestData, prefixed } from "../helpers";

const sql = getSql();

async function setupProduct(name: string) {
  const productRows = await sql`
    INSERT INTO products (canonical_name, item_type) VALUES (${prefixed(name)}, 'box') RETURNING id
  `;
  const productId = productRows[0].id as string;

  const accountRows = await sql`
    INSERT INTO accounts (handle, display_name) VALUES (${prefixed(name + "-acct")}, ${prefixed(name + "-acct")})
    RETURNING id
  `;
  const accountId = accountRows[0].id as string;

  const postRows = await sql`
    INSERT INTO posts (account_id, posted_date, source_url)
    VALUES (${accountId}, '2024-03-01', ${prefixed(name + "-post")})
    RETURNING id
  `;
  const postId = postRows[0].id as string;

  return { productId, accountId, postId };
}

describe("GET /api/summary/products/compare", () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  it("product_idsが空なら空配列を返す（DBに触れず早期return）", async () => {
    const req = new NextRequest("http://localhost/api/summary/products/compare");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toEqual([]);
  });

  it("同日の複数件を日単位で平均する", async () => {
    const { productId, accountId, postId } = await setupProduct("比較商品A");
    await sql`
      INSERT INTO extracted_items (post_id, account_id, product_id, product_name_raw, item_type, price_type, price, confidence)
      VALUES
        (${postId}, ${accountId}, ${productId}, ${prefixed("比較商品A")}, 'box', 'sell', 1000, 0.9),
        (${postId}, ${accountId}, ${productId}, ${prefixed("比較商品A")}, 'box', 'sell', 2000, 0.9)
    `;

    const req = new NextRequest(
      `http://localhost/api/summary/products/compare?product_ids=${productId}&granularity=day&price_type=sell`
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows.length).toBe(1);
    expect(body.rows[0].product_id).toBe(productId);
    expect(body.rows[0].avg_price).toBe(1500);
    expect(body.rows[0].sample_count).toBe(2);
    expect(body.rows[0].bucket).toBe("2024-03-01");
  });

  it("review_status=rejectedの行は平均・件数から除外される", async () => {
    const { productId, accountId, postId } = await setupProduct("比較商品B");
    await sql`
      INSERT INTO extracted_items (post_id, account_id, product_id, product_name_raw, item_type, price_type, price, confidence, review_status)
      VALUES
        (${postId}, ${accountId}, ${productId}, ${prefixed("比較商品B")}, 'box', 'sell', 5000, 0.9, 'confirmed'),
        (${postId}, ${accountId}, ${productId}, ${prefixed("比較商品B")}, 'box', 'sell', 999999, 0.9, 'rejected')
    `;

    const req = new NextRequest(
      `http://localhost/api/summary/products/compare?product_ids=${productId}&granularity=day&price_type=sell`
    );
    const res = await GET(req);
    const body = await res.json();
    expect(body.rows.length).toBe(1);
    expect(body.rows[0].avg_price).toBe(5000);
    expect(body.rows[0].sample_count).toBe(1);
  });

  it("price_typeで絞り込まれる（buyの行はsell指定では出てこない）", async () => {
    const { productId, accountId, postId } = await setupProduct("比較商品C");
    await sql`
      INSERT INTO extracted_items (post_id, account_id, product_id, product_name_raw, item_type, price_type, price, confidence)
      VALUES (${postId}, ${accountId}, ${productId}, ${prefixed("比較商品C")}, 'box', 'buy', 100, 0.9)
    `;

    const req = new NextRequest(
      `http://localhost/api/summary/products/compare?product_ids=${productId}&granularity=day&price_type=sell`
    );
    const res = await GET(req);
    const body = await res.json();
    expect(body.rows.length).toBe(0);
  });
});
