import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { formatJstDateLabel, matchDbProductName, medianShopPrice, parsePokecaBoxHikakuEntries } from "@/lib/secondary-market-fallback";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_URL = "https://pokeca-box-hikaku.com/";
const SOURCE_LABEL = "pokeca-box-hikaku.com";

/**
 * Vercel Cronからの呼び出しであることを確認する（Vercel公式の方式）。
 * CRON_SECRETを設定すると、Vercel Cronは自動で `Authorization: Bearer <CRON_SECRET>` を付けて叩く。
 * ローカル開発では環境変数を用意していないことが多いため、未設定時は認証をスキップして通す
 * （本番のVercel環境変数にCRON_SECRETを設定し忘れると誰でも叩けてしまう点は運用側で注意すること）。
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn(
      "[secondary-market-fallback] CRON_SECRET が未設定のため認証チェックをスキップします（ローカル動作確認用の挙動。本番では必ず設定すること）"
    );
    return true;
  }
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * GET /api/cron/secondary-market-fallback — 2次流通価格更新の「安全網」（B）。
 *
 * 普段はClaude Codeのセッション内一時cron（A）が毎日調査・更新しているが、Aは最長7日で自動終了する。
 * このルートはVercel Cronから1日1回叩かれ、secondary_market_checked_atが8日以上古い（＝Aが止まって
 * 放置された）商品だけを対象に、pokeca-box-hikaku.com（買取価格比較サイト、9店舗分を毎日自動更新）から
 * シュリンク付きBOXの買取価格（中央値）を取得して埋める。個人間相場・シュリンク無し買取は対応する
 * ライブデータの情報源が見つからなかったため更新しない（無理に埋めず、取得できた項目だけ更新する）。
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }

  const sql = getSql();
  const staleProducts = await sql`
    SELECT id, canonical_name
    FROM products
    WHERE secondary_market_checked_at IS NULL
       OR secondary_market_checked_at < now() - interval '8 days'
  `;

  if (staleProducts.length === 0) {
    return NextResponse.json({ staleCount: 0, updated: 0, message: "更新が必要な商品はありません" });
  }

  let html: string;
  try {
    const res = await fetch(SOURCE_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TorecaSoubaFallbackBot/1.0)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : "取得に失敗しました";
    console.error(`[secondary-market-fallback] ${SOURCE_LABEL} の取得に失敗: ${message}`);
    return NextResponse.json(
      { error: `${SOURCE_LABEL} の取得に失敗しました: ${message}`, staleCount: staleProducts.length, updated: 0 },
      { status: 502 }
    );
  }

  const entries = parsePokecaBoxHikakuEntries(html);
  if (entries.length === 0) {
    console.error(`[secondary-market-fallback] ${SOURCE_LABEL} から価格データを抽出できませんでした（サイト構造が変わった可能性）`);
    return NextResponse.json(
      { error: "価格データを抽出できませんでした（サイト構造が変わった可能性）", staleCount: staleProducts.length, updated: 0 },
      { status: 502 }
    );
  }

  const staleNames = staleProducts.map((p) => p.canonical_name as string);
  const staleIdByName = new Map(staleProducts.map((p) => [p.canonical_name as string, p.id as string]));

  // 商品名 → 更新候補。同じ商品に複数のサイト側エントリがマッチした場合（例:
  // 「拡張パック」と「拡張パックDX」が両方とも同じDB商品名に丸められた場合）は、
  // どちらが正しいか一意に決められないため、その商品は更新せず取りこぼす。
  const candidatesByName = new Map<string, { price: number; shopCount: number }[]>();
  for (const entry of entries) {
    const matchedName = matchDbProductName(entry.name, staleNames);
    if (!matchedName) continue;
    const price = medianShopPrice(entry.shopPrices);
    if (price === null) continue;
    const shopCount = Object.values(entry.shopPrices).filter((v) => v > 0).length;
    const list = candidatesByName.get(matchedName) ?? [];
    list.push({ price, shopCount });
    candidatesByName.set(matchedName, list);
  }

  const checkedLabel = formatJstDateLabel(new Date());
  const updatedProducts: { canonical_name: string; secondary_market_price_buyback_shrink: number }[] = [];
  let ambiguousSkipped = 0;

  for (const [name, candidates] of candidatesByName) {
    if (candidates.length > 1) {
      ambiguousSkipped++;
      continue;
    }
    const id = staleIdByName.get(name);
    if (!id) continue;
    const { price, shopCount } = candidates[0];
    const trendNote = `※自動更新（安全網／${SOURCE_LABEL}、掲載${shopCount}店舗の中央値、${checkedLabel}）`;

    await sql`
      UPDATE products SET
        secondary_market_price_buyback_shrink = ${price},
        secondary_market_trend_buyback_shrink = ${trendNote},
        secondary_market_checked_at = now()
      WHERE id = ${id}
    `;
    updatedProducts.push({ canonical_name: name, secondary_market_price_buyback_shrink: price });
  }

  return NextResponse.json({
    staleCount: staleProducts.length,
    sourceEntries: entries.length,
    updated: updatedProducts.length,
    ambiguousSkipped,
    updatedProducts,
  });
}
