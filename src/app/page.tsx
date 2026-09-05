"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { jsonFetcher, readJson } from "@/lib/api-client";
import { monthsAgoLocalDate, normalizeDateInput, todayLocalDate } from "@/lib/date";
import { formatYen } from "@/lib/format";
import { useLegendToggle } from "@/hooks/useLegendToggle";
import type { PriceType, Product, ProductAlias } from "@/types/domain";

interface ProductWithAliases extends Product {
  product_aliases: ProductAlias[];
}

interface CompareRow {
  product_id: string;
  product_name: string;
  bucket: string;
  avg_price: number;
  sample_count: number;
}

interface SecondaryHistoryRow {
  product_id: string;
  product_name: string;
  date: string;
  price_individual: number | null;
  price_buyback_shrink: number | null;
  price_buyback_noshrink: number | null;
}

type Granularity = "day" | "year";
type SecondaryMetric = "individual" | "buybackShrink" | "buybackNoshrink";

const YEAR_UNKNOWN = "不明";

const SECONDARY_METRIC_FIELD: Record<SecondaryMetric, "price_individual" | "price_buyback_shrink" | "price_buyback_noshrink"> = {
  individual: "price_individual",
  buybackShrink: "price_buyback_shrink",
  buybackNoshrink: "price_buyback_noshrink",
};

const SECONDARY_METRIC_LABEL: Record<SecondaryMetric, string> = {
  individual: "個人間",
  buybackShrink: "買取（シュリンク有）",
  buybackNoshrink: "買取（シュリンク無）",
};

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

/** 折れ線・棒グラフの色。選択数ぶん色相を均等に割るので、何色選んでも重複しない */
function colorForSeries(index: number, total: number): string {
  const hue = Math.round((360 * index) / Math.max(total, 1));
  return `hsl(${hue}, 65%, 45%)`;
}

function pivotRows(rows: CompareRow[]): Array<{ bucket: string } & Record<string, number | string>> {
  const map = new Map<string, { bucket: string } & Record<string, number | string>>();
  for (const r of rows) {
    if (!map.has(r.bucket)) map.set(r.bucket, { bucket: r.bucket });
    map.get(r.bucket)![r.product_name] = r.avg_price;
  }
  return Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
}

/** 2次流通の推移データを日付ごとにまとめ、商品名をキーにした行へ変換する（商品ごとに1本の線にするため） */
function pivotSecondaryHistory(
  rows: SecondaryHistoryRow[],
  metric: SecondaryMetric
): Array<{ date: string } & Record<string, number | string>> {
  const field = SECONDARY_METRIC_FIELD[metric];
  const map = new Map<string, { date: string } & Record<string, number | string>>();
  for (const r of rows) {
    const value = r[field];
    if (value == null) continue;
    if (!map.has(r.date)) map.set(r.date, { date: r.date });
    map.get(r.date)![r.product_name] = value;
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export default function ProductsPage() {
  const { data, error: loadError, mutate } = useSWR<{ products: ProductWithAliases[] }>(
    "/api/products",
    jsonFetcher
  );
  const products = useMemo(() => data?.products ?? [], [data]);
  const trendLegend = useLegendToggle();

  // 2次流通データの最新調査日時（一番新しいものが7日以上前なら更新を促す）
  const latestSecondaryCheckedAt = useMemo(() => {
    const dates = products.map((p) => p.secondary_market_checked_at).filter((d): d is string => !!d);
    return dates.length === 0 ? null : dates.reduce((a, b) => (a > b ? a : b));
  }, [products]);
  const daysSinceSecondaryUpdate = latestSecondaryCheckedAt ? daysSince(latestSecondaryCheckedAt) : null;

  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const [yearIndexOverride, setYearIndexOverride] = useState<number | null>(null);
  const [mergeFrom, setMergeFrom] = useState("");
  const [mergeInto, setMergeInto] = useState("");
  const [mergeMessage, setMergeMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // 実際にグラフへ反映されている条件（「検索」ボタンを押すまで変わらない）
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [priceType, setPriceType] = useState<PriceType>("sell");
  const [trendYMin, setTrendYMin] = useState("");
  const [trendYMax, setTrendYMax] = useState("");
  // 未入力時は「今日から1ヶ月前〜今日」をデフォルトの表示期間にする
  const [trendXFrom, setTrendXFrom] = useState(() => monthsAgoLocalDate(1));
  const [trendXTo, setTrendXTo] = useState(todayLocalDate);
  // 入力中の下書き（「検索」ボタンで上の実条件へ反映する）
  const [draftGranularity, setDraftGranularity] = useState<Granularity>("day");
  const [draftPriceType, setDraftPriceType] = useState<PriceType>("sell");
  const [draftYMin, setDraftYMin] = useState("");
  const [draftYMax, setDraftYMax] = useState("");
  const [draftXFrom, setDraftXFrom] = useState(() => monthsAgoLocalDate(1));
  const [draftXTo, setDraftXTo] = useState(todayLocalDate);
  const [secondaryMetric, setSecondaryMetric] = useState<SecondaryMetric>("individual");
  const secondaryLegend = useLegendToggle();

  const isSearching = search.trim().length > 0;
  const filtered = products.filter((p) => p.canonical_name.toLowerCase().includes(search.toLowerCase()));

  // 発売年ごとの一覧（検索していない時だけ使う。検索中は全年代を横断する）
  const years = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) set.add(p.release_date ? p.release_date.slice(0, 4) : YEAR_UNKNOWN);
    const real = Array.from(set).filter((y) => y !== YEAR_UNKNOWN).sort();
    return set.has(YEAR_UNKNOWN) ? [...real, YEAR_UNKNOWN] : real;
  }, [products]);
  const defaultYearIndex = years.length === 0 ? 0 : years[years.length - 1] === YEAR_UNKNOWN ? Math.max(years.length - 2, 0) : years.length - 1;
  const yearIndex = yearIndexOverride ?? defaultYearIndex;
  const currentYear = years[yearIndex];
  const yearProducts = useMemo(
    () =>
      currentYear === undefined
        ? []
        : products.filter((p) => (p.release_date ? p.release_date.slice(0, 4) : YEAR_UNKNOWN) === currentYear),
    [products, currentYear]
  );

  const listSource = isSearching ? filtered : yearProducts;
  const visibleProducts = listSource.slice(0, visibleCount);
  const selectedProducts = products.filter((p) => selectedIds.includes(p.id));

  function goToYear(newIndex: number) {
    setYearIndexOverride(Math.min(Math.max(newIndex, 0), years.length - 1));
    setVisibleCount(30);
  }

  /** 今表示中の年（検索中は検索結果）に含まれる選択だけを外す。他の年の選択は残す */
  function clearSelectionInView() {
    const idsInView = new Set(listSource.map((p) => p.id));
    setSelectedIds((prev) => prev.filter((id) => !idsInView.has(id)));
  }

  /** 下書きの検索条件を実際の表示に反映する（「検索」ボタン） */
  function applyTrendFilters() {
    setGranularity(draftGranularity);
    setPriceType(draftPriceType);
    setTrendXFrom(normalizeDateInput(draftXFrom));
    setTrendXTo(normalizeDateInput(draftXTo));
    setTrendYMin(draftYMin);
    setTrendYMax(draftYMax);
  }

  const compareQs = new URLSearchParams({ product_ids: selectedIds.join(","), granularity, price_type: priceType });
  const { data: compareData, error: compareError } = useSWR<{ rows: CompareRow[] }>(
    selectedIds.length > 0 ? `/api/summary/products/compare?${compareQs.toString()}` : null,
    jsonFetcher
  );
  const chartDataAll = useMemo(() => pivotRows(compareData?.rows ?? []), [compareData]);
  const chartData = useMemo(
    () =>
      chartDataAll.filter(
        (row) => (!trendXFrom || row.bucket >= trendXFrom) && (!trendXTo || row.bucket <= trendXTo)
      ),
    [chartDataAll, trendXFrom, trendXTo]
  );
  const trendYDomain: [number | "auto", number | "auto"] = [
    trendYMin.trim() ? Number(trendYMin) : "auto",
    trendYMax.trim() ? Number(trendYMax) : "auto",
  ];

  const secondaryHistoryQs = new URLSearchParams({ product_ids: selectedIds.join(",") });
  const { data: secondaryHistoryData, error: secondaryHistoryError } = useSWR<{ rows: SecondaryHistoryRow[] }>(
    selectedIds.length > 0 ? `/api/summary/products/secondary-history?${secondaryHistoryQs.toString()}` : null,
    jsonFetcher
  );
  const secondaryChartData = useMemo(
    () => pivotSecondaryHistory(secondaryHistoryData?.rows ?? [], secondaryMetric),
    [secondaryHistoryData, secondaryMetric]
  );
  const hasSecondaryData = secondaryChartData.length > 0;

  function toggleProduct(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleMerge(e: React.FormEvent) {
    e.preventDefault();
    setMergeMessage(null);
    if (!mergeFrom || !mergeInto || mergeFrom === mergeInto) {
      setMergeMessage("統合元と統合先に異なる商品を選択してください");
      return;
    }
    try {
      const res = await fetch("/api/products/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_product_id: mergeFrom, into_product_id: mergeInto }),
      });
      await readJson(res);
      setMergeMessage("統合しました");
      setMergeFrom("");
      setMergeInto("");
      mutate();
    } catch (err) {
      setMergeMessage(err instanceof Error ? err.message : "統合に失敗しました");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">商品・相場比較</h1>
        <a
          href="/api/export/products-csv"
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          商品マスタCSVを出力
        </a>
      </div>

      {daysSinceSecondaryUpdate !== null && daysSinceSecondaryUpdate >= 7 && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          ⚠️ 2次流通データの最終更新から{daysSinceSecondaryUpdate}日経過しています。Claude Codeのセッションで「更新して」と伝えてください。
        </p>
      )}

      <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">選択した商品の比較（{selectedProducts.length}件）</h2>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs opacity-60 hover:underline"
            >
              選択解除
            </button>
          )}
        </div>

        {selectedIds.length === 0 ? (
          <p className="text-sm opacity-60">
            商品名の左にあるチェックボックスにチェックを入れると、ここに価格推移や2次流通の比較が折れ線グラフで表示されます。
          </p>
        ) : (
          <>
          <div className="mb-4 flex flex-wrap gap-2">
            {selectedProducts.map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-1.5 rounded-full bg-black/5 py-1 pl-1 pr-2.5 text-xs dark:bg-white/10"
              >
                {p.has_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/products/${p.id}/image`} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <span className="h-5 w-5 rounded-full bg-black/10 dark:bg-white/20" />
                )}
                {p.canonical_name}
              </span>
            ))}
          </div>

          <h3 className="mb-2 text-xs font-semibold opacity-70">投稿ベースのトレンド比較</h3>
          <div className="mb-4 flex flex-wrap gap-3">
            <label className="text-sm">
              <span className="mb-1 block opacity-60">時間の単位</span>
              <select
                value={draftGranularity}
                onChange={(e) => setDraftGranularity(e.target.value as Granularity)}
                className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
              >
                <option value="day">1日単位</option>
                <option value="year">年単位</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block opacity-60">価格区分</span>
              <select
                value={draftPriceType}
                onChange={(e) => setDraftPriceType(e.target.value as PriceType)}
                className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
              >
                <option value="sell">販売</option>
                <option value="buy">買取</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block opacity-60">期間（任意・どんな形式でも可）From</span>
              <input
                value={draftXFrom}
                onChange={(e) => setDraftXFrom(e.target.value)}
                placeholder="2026-1-1 / 2026年1月1日 等"
                className="w-40 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block opacity-60">期間 To</span>
              <input
                value={draftXTo}
                onChange={(e) => setDraftXTo(e.target.value)}
                placeholder="2026-12-31 / 2026年12月31日 等"
                className="w-40 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block opacity-60">金額の範囲（円・任意）下限</span>
              <input
                type="number"
                value={draftYMin}
                onChange={(e) => setDraftYMin(e.target.value)}
                placeholder="自動"
                className="w-28 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block opacity-60">上限</span>
              <input
                type="number"
                value={draftYMax}
                onChange={(e) => setDraftYMax(e.target.value)}
                placeholder="自動"
                className="w-28 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
              />
            </label>
            <button
              type="button"
              onClick={applyTrendFilters}
              className="self-end rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              検索
            </button>
            {(trendXFrom || trendXTo || trendYMin || trendYMax) && (
              <button
                type="button"
                onClick={() => {
                  setDraftXFrom("");
                  setDraftXTo("");
                  setDraftYMin("");
                  setDraftYMax("");
                  setTrendXFrom("");
                  setTrendXTo("");
                  setTrendYMin("");
                  setTrendYMax("");
                }}
                className="self-end rounded-md border border-black/15 px-3 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                範囲指定を解除
              </button>
            )}
          </div>

          {compareError && <p className="text-sm text-red-500">{compareError.message}</p>}

          {chartData.length > 0 ? (
            <div className="mb-6 h-80 overflow-x-auto">
              <div className="h-full" style={{ minWidth: Math.max(chartData.length * 60, 320) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="bucket" fontSize={12} />
                    <YAxis fontSize={12} domain={trendYDomain} tickFormatter={(v) => formatYen(v)} />
                    <Tooltip formatter={(v) => formatYen(v)} />
                    <Legend onClick={trendLegend.onLegendClick} formatter={trendLegend.legendFormatter} />
                    {selectedProducts.map((p, i) => (
                      <Line
                        key={p.id}
                        type="monotone"
                        dataKey={p.canonical_name}
                        stroke={colorForSeries(i, selectedProducts.length)}
                        connectNulls
                        dot={{ r: 3 }}
                        hide={trendLegend.isHidden(p.canonical_name)}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="mb-6 text-sm opacity-60">
              選択した商品・価格区分（{priceType === "sell" ? "販売" : "買取"}）の投稿データがまだありません。
            </p>
          )}

          <h3 className="mb-2 text-xs font-semibold opacity-70">2次流通の比較（商品ごとの時系列）</h3>
          <div className="mb-3 flex flex-wrap gap-4 text-sm">
            {(Object.keys(SECONDARY_METRIC_LABEL) as SecondaryMetric[]).map((metric) => (
              <label key={metric} className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="secondary-metric"
                  checked={secondaryMetric === metric}
                  onChange={() => setSecondaryMetric(metric)}
                />
                {SECONDARY_METRIC_LABEL[metric]}
              </label>
            ))}
          </div>

          {secondaryHistoryError && <p className="text-sm text-red-500">{secondaryHistoryError.message}</p>}

          {hasSecondaryData ? (
            <div className="h-72 overflow-x-auto">
              <div className="h-full" style={{ minWidth: Math.max(secondaryChartData.length * 60, 320) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={secondaryChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={12} tickFormatter={(v) => formatYen(v)} />
                    <Tooltip formatter={(v) => formatYen(v as number)} />
                    <Legend onClick={secondaryLegend.onLegendClick} formatter={secondaryLegend.legendFormatter} />
                    {selectedProducts.map((p, i) => (
                      <Line
                        key={p.id}
                        type="monotone"
                        dataKey={p.canonical_name}
                        stroke={colorForSeries(i, selectedProducts.length)}
                        connectNulls
                        dot={{ r: 3 }}
                        hide={secondaryLegend.isHidden(p.canonical_name)}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-sm opacity-60">選択した商品に2次流通データの推移がまだありません。</p>
          )}
          </>
        )}
      </div>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setVisibleCount(30);
        }}
        placeholder="商品名で絞り込み（全年代から検索）"
        className="w-full max-w-sm rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
      />

      {loadError && <p className="text-sm text-red-500">{loadError.message}</p>}

      {!isSearching && years.length > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/10">
          <button
            type="button"
            onClick={() => goToYear(yearIndex - 1)}
            disabled={yearIndex <= 0}
            className="rounded px-2 py-1 hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10"
          >
            ← 前の年
          </button>
          <span className="font-medium">{currentYear === YEAR_UNKNOWN ? "発売日不明" : `${currentYear}年`}</span>
          <button
            type="button"
            onClick={() => goToYear(yearIndex + 1)}
            disabled={yearIndex >= years.length - 1}
            className="rounded px-2 py-1 hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10"
          >
            次の年 →
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs opacity-50">
          {listSource.length}件中 {visibleProducts.length}件を表示（選択中：全体{selectedIds.length}件）
        </p>
        {selectedIds.length > 0 && (
          <div className="flex gap-3 text-xs">
            <button type="button" onClick={clearSelectionInView} className="opacity-60 hover:underline">
              {isSearching
                ? "検索結果の選択だけ解除"
                : currentYear === YEAR_UNKNOWN
                  ? "発売日不明の選択だけ解除"
                  : `${currentYear}年の選択だけ解除`}
            </button>
            <button type="button" onClick={() => setSelectedIds([])} className="opacity-60 hover:underline">
              全年代の選択を解除
            </button>
          </div>
        )}
      </div>

      <ul className="divide-y divide-black/5 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
        {visibleProducts.map((p) => {
          const buybackPrice = p.secondary_market_price_buyback_shrink;
          return (
            <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                  className="mt-1 h-4 w-4 shrink-0"
                  aria-label={`${p.canonical_name}をトレンド比較に追加`}
                />
                {p.has_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/products/${p.id}/image`}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-black/5 text-[10px] opacity-40 dark:bg-white/10">
                    画像無し
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${p.id}`} className="font-medium hover:underline">
                    {p.canonical_name}
                  </Link>
                  {p.release_date && <span className="ml-2 text-xs opacity-40">{p.release_date}</span>}
                  <div className="flex flex-wrap gap-x-3 text-xs opacity-50">
                    {p.retail_price != null && <span>定価: {formatYen(p.retail_price)}</span>}
                    {p.secondary_market_price_individual != null && (
                      <span>個人間: {formatYen(p.secondary_market_price_individual)}</span>
                    )}
                    {buybackPrice != null && <span>買取（有）: {formatYen(buybackPrice)}</span>}
                  </div>
                </div>
              </div>
              <span className="shrink-0 rounded bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                {p.item_type === "box" ? "BOX" : p.item_type === "pack" ? "パック" : "その他"}
              </span>
            </li>
          );
        })}
        {listSource.length === 0 && <li className="px-4 py-3 text-sm opacity-60">商品がありません</li>}
      </ul>

      {visibleCount < listSource.length && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + 30)}
          className="w-full rounded-md border border-black/15 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          さらに表示（残り{listSource.length - visibleCount}件）
        </button>
      )}


      <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
        <h2 className="mb-3 text-sm font-semibold">表記ゆれの統合</h2>
        <p className="mb-3 text-xs opacity-60">
          同じ商品が別名で登録されてしまった場合、統合元を統合先へまとめられます（統合元は削除されます）。
        </p>
        <form onSubmit={handleMerge} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block">統合元（消える方）</span>
            <select
              value={mergeFrom}
              onChange={(e) => setMergeFrom(e.target.value)}
              className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
            >
              <option value="">選択</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.canonical_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block">統合先（残る方）</span>
            <select
              value={mergeInto}
              onChange={(e) => setMergeInto(e.target.value)}
              className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
            >
              <option value="">選択</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.canonical_name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
            統合する
          </button>
        </form>
        {mergeMessage && <p className="mt-2 text-sm">{mergeMessage}</p>}
      </div>
    </div>
  );
}
