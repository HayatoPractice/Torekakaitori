import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSql, isPgError, PG_UNIQUE_VIOLATION } from "@/lib/db";
import { parseBody } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

const priceField = z
  .number({ message: "価格は数値で指定してください" })
  .int("価格は整数で指定してください")
  .min(0, "価格は0以上にしてください")
  .nullable()
  .optional();
const trendField = z.string({ message: "傾向メモは文字列で指定してください" }).nullable().optional();

const patchProductSchema = z.object({
  canonical_name: z
    .string({ message: "canonical_name は文字列で指定してください" })
    .trim()
    .min(1, "canonical_name は空にできません")
    .optional(),
  resale_notes: z.string({ message: "resale_notes は文字列で指定してください" }).nullable().optional(),
  release_date: z
    .string({ message: "release_date はYYYY-MM-DD形式で指定してください" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "release_date はYYYY-MM-DD形式で指定してください")
    .nullable()
    .optional(),
  retail_price: priceField,
  secondary_market_price_individual: priceField,
  secondary_market_trend_individual: trendField,
  secondary_market_price_buyback_shrink: priceField,
  secondary_market_trend_buyback_shrink: trendField,
  secondary_market_price_buyback_noshrink: priceField,
  secondary_market_trend_buyback_noshrink: trendField,
});

/** 「キーが無い＝変更しない」「null/空文字＝クリアする」を区別するためのヘルパー */
function readTriState<T>(body: Record<string, unknown>, key: string, value: T | null | undefined) {
  const present = key in body;
  return { present, value: present ? (value ?? null) : null };
}

/**
 * PATCH /api/products/[id]
 * 商品名・再販履歴メモ・発売日・2次流通相場（個人間／買取シュリンク有／買取シュリンク無）を編集する。
 * 2次流通のいずれかが送られてきたら、調査日時（secondary_market_checked_at）をサーバー側で自動更新する。
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const parsed = parseBody(patchProductSchema, body);
  if ("error" in parsed) return parsed.error;
  const data = parsed.data;
  const { canonical_name: canonicalName } = data;

  const resaleNotes = readTriState(body, "resale_notes", data.resale_notes?.trim() || null);
  const releaseDate = readTriState(body, "release_date", data.release_date);
  const retailPrice = readTriState(body, "retail_price", data.retail_price);
  const priceIndividual = readTriState(body, "secondary_market_price_individual", data.secondary_market_price_individual);
  const trendIndividual = readTriState(body, "secondary_market_trend_individual", data.secondary_market_trend_individual?.trim() || null);
  const priceBuybackShrink = readTriState(body, "secondary_market_price_buyback_shrink", data.secondary_market_price_buyback_shrink);
  const trendBuybackShrink = readTriState(body, "secondary_market_trend_buyback_shrink", data.secondary_market_trend_buyback_shrink?.trim() || null);
  const priceBuybackNoshrink = readTriState(body, "secondary_market_price_buyback_noshrink", data.secondary_market_price_buyback_noshrink);
  const trendBuybackNoshrink = readTriState(body, "secondary_market_trend_buyback_noshrink", data.secondary_market_trend_buyback_noshrink?.trim() || null);
  const touchesSecondaryMarket =
    priceIndividual.present || trendIndividual.present || priceBuybackShrink.present || trendBuybackShrink.present || priceBuybackNoshrink.present || trendBuybackNoshrink.present;
  // 価格そのものが変わった時だけ推移として記録する（傾向メモだけの編集では記録しない）
  const touchesSecondaryMarketPrice = priceIndividual.present || priceBuybackShrink.present || priceBuybackNoshrink.present;

  const sql = getSql();
  try {
    const updated = await sql`
      UPDATE products SET
        canonical_name = COALESCE(${canonicalName ?? null}, canonical_name),
        resale_notes = CASE WHEN ${resaleNotes.present} THEN ${resaleNotes.value} ELSE resale_notes END,
        release_date = CASE WHEN ${releaseDate.present} THEN ${releaseDate.value}::date ELSE release_date END,
        retail_price = CASE WHEN ${retailPrice.present} THEN ${retailPrice.value} ELSE retail_price END,
        secondary_market_price_individual = CASE WHEN ${priceIndividual.present} THEN ${priceIndividual.value} ELSE secondary_market_price_individual END,
        secondary_market_trend_individual = CASE WHEN ${trendIndividual.present} THEN ${trendIndividual.value} ELSE secondary_market_trend_individual END,
        secondary_market_price_buyback_shrink = CASE WHEN ${priceBuybackShrink.present} THEN ${priceBuybackShrink.value} ELSE secondary_market_price_buyback_shrink END,
        secondary_market_trend_buyback_shrink = CASE WHEN ${trendBuybackShrink.present} THEN ${trendBuybackShrink.value} ELSE secondary_market_trend_buyback_shrink END,
        secondary_market_price_buyback_noshrink = CASE WHEN ${priceBuybackNoshrink.present} THEN ${priceBuybackNoshrink.value} ELSE secondary_market_price_buyback_noshrink END,
        secondary_market_trend_buyback_noshrink = CASE WHEN ${trendBuybackNoshrink.present} THEN ${trendBuybackNoshrink.value} ELSE secondary_market_trend_buyback_noshrink END,
        secondary_market_checked_at = CASE WHEN ${touchesSecondaryMarket} THEN now() ELSE secondary_market_checked_at END
      WHERE id = ${id}
      RETURNING
        id, canonical_name, item_type, created_at, resale_notes, release_date::text AS release_date,
        retail_price, secondary_market_price_individual, secondary_market_trend_individual,
        secondary_market_price_buyback_shrink, secondary_market_trend_buyback_shrink,
        secondary_market_price_buyback_noshrink, secondary_market_trend_buyback_noshrink,
        secondary_market_checked_at, (image_data IS NOT NULL) AS has_image
    `;
    if (updated.length === 0) return NextResponse.json({ error: "商品が見つかりません" }, { status: 404 });
    const product = updated[0];
    if (touchesSecondaryMarketPrice) {
      await sql`
        INSERT INTO secondary_market_history (product_id, price_individual, price_buyback_shrink, price_buyback_noshrink)
        VALUES (${id}, ${product.secondary_market_price_individual}, ${product.secondary_market_price_buyback_shrink}, ${product.secondary_market_price_buyback_noshrink})
      `;
    }
    return NextResponse.json({ product });
  } catch (err) {
    if (isPgError(err, PG_UNIQUE_VIOLATION)) {
      return NextResponse.json({ error: `商品名「${canonicalName}」は既に登録されています` }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "更新に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
