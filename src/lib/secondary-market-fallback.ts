/**
 * 2次流通価格の安全網（B）が使う、pokeca-box-hikaku.com（ポケカ買取チェッカー）のHTML解析。
 *
 * 【背景】このアプリの2次流通データは普段Claude Codeのセッション内一時cronが毎日調査・更新している（A）が、
 * Aは最長7日で自動終了するため、Aが止まって古くなった商品だけをVercel Cron（B）が最低限自動更新する。
 * BはClaude CodeのようなWebSearch/WebFetchが使えないサーバーレス関数のため、素朴なfetch()で
 * 情報源サイトへ直接アクセスする。price-base.comは実際に確認したところポケカBOXの価格データを
 * 持たず（/pokemon/ 以下は単品カードのPSA/美品ランキングサイトfoliva.jpへ転送されるのみ）、
 * pokeca-box-hikaku.comのみが「シュリンク付きBOXの買取価格を9店舗分、毎日自動更新」という
 * 目的に一致する構造化データを持っていたため、こちらだけを情報源として使う（2026-09-04検証済み）。
 *
 * 【取得できるデータの範囲】このサイトのトップページに埋め込まれたJS配列から取れるのは
 * 「シュリンク付きBOXの買取価格（店舗ごと）」のみ。個人間相場・シュリンク無し買取は
 * 対応するライブデータが見つからなかったため、このモジュールは
 * secondary_market_price_buyback_shrink しか埋めない（無理に埋めない方針）。
 */

/** pokeca-box-hikaku.com トップページのHTMLから読み取った1商品分のデータ */
export interface PokecaBoxEntry {
  category: string;
  /** サイト上の表示名（例: "MEGA 拡張パック「アビスアイ」"） */
  name: string;
  slug: string;
  /** 店舗名 → 買取価格（0 = その店舗は取り扱いなし） */
  shopPrices: Record<string, number>;
}

/**
 * トップページのHTMLに埋め込まれた `const P=[...]` という生JS配列リテラルを読み取る。
 * サイトはNext.js等ではなく素のHTML+インラインJSで組まれており、価格データはAPI経由ではなく
 * ページ本体に直接書き込まれているため、正規表現でオブジェクトリテラルを1件ずつ拾う。
 * （2026-09-04時点でこの形式を実際にfetchして確認済み。サイト側の実装が変わると解析できなくなる）
 */
export function parsePokecaBoxHikakuEntries(html: string): PokecaBoxEntry[] {
  const start = html.indexOf("const P=[");
  if (start === -1) return [];
  const end = html.indexOf("\n];", start);
  const snippet = end === -1 ? html.slice(start) : html.slice(start, end);

  const entryPattern =
    /\{c:"(\w+)",n:"([^"]+)",s:"([^"]+)",r:\d+,d:"[^"]*",y:\d+,p:\{([^}]*)\}\}/g;
  const entries: PokecaBoxEntry[] = [];
  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(snippet)) !== null) {
    const [, category, name, slug, shopPricesRaw] = match;
    const shopPrices: Record<string, number> = {};
    for (const pairMatch of shopPricesRaw.matchAll(/(\w+):(\d+)/g)) {
      shopPrices[pairMatch[1]] = Number(pairMatch[2]);
    }
    entries.push({ category, name, slug, shopPrices });
  }
  return entries;
}

/** サイト表示名から「」内の弾名を取り出す。「」が無ければ表示名全体をそのまま使う */
export function extractCoreName(siteName: string): string {
  const bracketMatch = siteName.match(/「(.+?)」/);
  return bracketMatch ? bracketMatch[1] : siteName;
}

/**
 * 買取・カードファイル・デッキ等、単品BOXと混同すると誤った商品に価格を書いてしまう単語。
 * サイト表示名に無いのにDB商品名にだけこの単語が含まれる場合は、別商品（同梱セット等）とみなして除外する。
 */
const BUNDLE_WORDS = ["セット", "ファイル", "福袋", "同梱", "スリーブ", "キャンペーン", "グッズ", "デッキ"];

/**
 * サイト表示名(n) と、抽出した弾名(core) から、DB商品名の中で対応する1件を探す。
 * 複数候補があって1件に絞れない場合はnullを返す（安全網なので、無理に当てず取りこぼす方を選ぶ）。
 *
 * 1. 弾名と完全一致するDB商品名があればそれを使う
 * 2. 無ければ「弾名を含むDB商品名」を候補にし、同梱セット等の混同を除外した上で、
 *    最も名前が短い（＝最も的を絞った）候補が一意に決まる場合だけ採用する
 */
export function matchDbProductName(siteName: string, dbCanonicalNames: string[]): string | null {
  const core = extractCoreName(siteName);

  const exact = dbCanonicalNames.filter((dbName) => dbName === core);
  if (exact.length === 1) return exact[0];

  let candidates = dbCanonicalNames.filter((dbName) => dbName.includes(core));
  const filtered = candidates.filter((dbName) =>
    BUNDLE_WORDS.every((word) => siteName.includes(word) || !dbName.includes(word))
  );
  if (filtered.length > 0) candidates = filtered;

  if (candidates.length === 0) return null;
  candidates = [...candidates].sort((a, b) => a.length - b.length);
  if (candidates.length === 1 || candidates[0].length < candidates[1].length) {
    return candidates[0];
  }
  return null; // 同じ長さの候補が複数残った＝一意に決められない
}

/**
 * サーバー側（Vercelの実行環境はUTC）で、日本時間の日付ラベル（YYYY-MM-DD）を作る。
 * トレンドメモに埋め込む「いつ自動更新したか」の表示用であり、日付境界のロジックには使わないが、
 * INC-033（サーバー側でtoISOString().slice(0,10)を使うとJST 0〜9時に日付が1日ずれる）を踏まないよう、
 * ローカルタイムゾーンに依存しない Intl.DateTimeFormat で明示的にAsia/Tokyoに変換する。
 */
export function formatJstDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(date);
}

/** 店舗ごとの買取価格から、0円（取り扱いなし）を除いた中央値を求める。1件も無ければnull */
export function medianShopPrice(shopPrices: Record<string, number>): number | null {
  const nonZero = Object.values(shopPrices)
    .filter((price) => price > 0)
    .sort((a, b) => a - b);
  if (nonZero.length === 0) return null;
  const mid = Math.floor(nonZero.length / 2);
  if (nonZero.length % 2 === 1) return nonZero[mid];
  return Math.round((nonZero[mid - 1] + nonZero[mid]) / 2);
}
