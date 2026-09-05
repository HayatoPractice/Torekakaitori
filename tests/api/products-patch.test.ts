import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { getSql } from "@/lib/db";
import { PATCH } from "@/app/api/products/[id]/route";
import { cleanupTestData, prefixed } from "../helpers";

const sql = getSql();

function callPatch(id: string, body: unknown) {
  const req = new NextRequest(`http://localhost/api/products/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(req, { params: Promise.resolve({ id }) });
}

describe("PATCH /api/products/[id]", () => {
  let productId: string;

  beforeAll(async () => {
    const rows = await sql`
      INSERT INTO products (
        canonical_name, item_type, resale_notes,
        secondary_market_price_individual, secondary_market_trend_individual
      )
      VALUES (
        ${prefixed("商品A")}, 'box', ${prefixed("初期メモ")},
        1000, ${prefixed("初期トレンド")}
      )
      RETURNING id
    `;
    productId = rows[0].id as string;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it("キーを省略したフィールドは変更されない（tri-state: 省略）", async () => {
    const res = await callPatch(productId, { canonical_name: prefixed("商品A-改名1") });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.product.canonical_name).toBe(prefixed("商品A-改名1"));
    // resale_notes / secondary_market_price_individual / trend はbodyに含めていないので変化しないはず
    expect(body.product.resale_notes).toBe(prefixed("初期メモ"));
    expect(body.product.secondary_market_price_individual).toBe(1000);
    expect(body.product.secondary_market_trend_individual).toBe(prefixed("初期トレンド"));
  });

  it("null を送るとクリアされる（tri-state: resale_notes）", async () => {
    const res = await callPatch(productId, { resale_notes: null });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.product.resale_notes).toBeNull();
    // 巻き添えで他フィールドが変わっていないことも確認
    expect(body.product.secondary_market_price_individual).toBe(1000);
  });

  it("価格に null を送るとクリアされ、調査日時(secondary_market_checked_at)が更新される", async () => {
    const beforeRows = await sql`SELECT secondary_market_checked_at FROM products WHERE id = ${productId}`;
    const beforeCheckedAt = beforeRows[0].secondary_market_checked_at;

    const res = await callPatch(productId, { secondary_market_price_individual: null });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.product.secondary_market_price_individual).toBeNull();
    expect(body.product.secondary_market_checked_at).not.toBeNull();
    expect(new Date(body.product.secondary_market_checked_at).getTime()).toBeGreaterThanOrEqual(
      beforeCheckedAt ? new Date(beforeCheckedAt).getTime() : 0
    );
  });

  it("空文字を送るとtrendフィールドがクリアされる（tri-state: 空文字）", async () => {
    const setRes = await callPatch(productId, {
      secondary_market_trend_buyback_shrink: prefixed("有シュリンク傾向"),
    });
    expect((await setRes.json()).product.secondary_market_trend_buyback_shrink).toBe(prefixed("有シュリンク傾向"));

    const clearRes = await callPatch(productId, { secondary_market_trend_buyback_shrink: "" });
    expect(clearRes.status).toBe(200);
    const body = await clearRes.json();
    expect(body.product.secondary_market_trend_buyback_shrink).toBeNull();
  });

  it("価格に負数を送るとエラーになる", async () => {
    const res = await callPatch(productId, { secondary_market_price_buyback_noshrink: -1 });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/0以上/);
  });

  it("release_date の不正フォーマットを拒否する", async () => {
    const res = await callPatch(productId, { release_date: "2024/01/01" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/YYYY-MM-DD/);
  });

  it("正しい release_date は保存され、null で再度クリアできる", async () => {
    const setRes = await callPatch(productId, { release_date: "2024-01-15" });
    expect(setRes.status).toBe(200);
    // NOTE: PATCHのレスポンス(RETURNING *)はrelease_dateをtextにcastしていないため、
    // ドライバがDateオブジェクトとして返しJSON化時にサーバーのタイムゾーンに応じてズレうる
    // （src/app/api/products/route.ts のGETは `release_date::text` で意図的に回避している）。
    // ここではDB側に実際に保存された値をground truthとして検証する。
    const dbRows = await sql`SELECT release_date::text AS release_date FROM products WHERE id = ${productId}`;
    expect(dbRows[0].release_date).toBe("2024-01-15");

    const clearRes = await callPatch(productId, { release_date: null });
    expect(clearRes.status).toBe(200);
    const clearBody = await clearRes.json();
    expect(clearBody.product.release_date).toBeNull();
  });

  it("存在しないIDは404を返す", async () => {
    const res = await callPatch(randomUUID(), { resale_notes: "x" });
    expect(res.status).toBe(404);
  });

  it("canonical_nameの重複は409を返す", async () => {
    const other = await sql`
      INSERT INTO products (canonical_name, item_type) VALUES (${prefixed("商品B")}, 'box') RETURNING id
    `;
    const otherId = other[0].id as string;
    const res = await callPatch(otherId, { canonical_name: prefixed("商品A-改名1") });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain(prefixed("商品A-改名1"));
  });
});
