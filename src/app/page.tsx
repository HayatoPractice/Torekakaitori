"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { jsonFetcher, readJson } from "@/lib/api-client";
import { prepareImageForUpload } from "@/lib/file";
import { formatYen } from "@/lib/format";
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

type Granularity = "day" | "year";
type ShrinkView = "shrink" | "noshrink";

const YEAR_UNKNOWN = "不明";

/** 棒グラフの色。選択数ぶん色相を均等に割るので、何色選んでも重複しない */
function colorForSeries(index: number, total: number): string {
  const hue = Math.round((360 * index) / Math.max(total, 1));
  return `hsl(${hue}, 65%, 45%)`;
}

/** バーの上に商品名を斜めに小さく表示する（凡例だけだと色の対応が追いにくいため） */
function renderBarNameLabel(name: string) {
  return function BarNameLabel(props: { x?: string | number; y?: string | number; width?: string | number }) {
    const x = Number(props.x ?? 0);
    const y = Number(props.y ?? 0);
    const width = Number(props.width ?? 0);
    return (
      <text
        x={x + width / 2}
        y={y - 4}
        textAnchor="start"
        fontSize={8}
        fill="currentColor"
        opacity={0.6}
        transform={`rotate(-60, ${x + width / 2}, ${y - 4})`}
      >
        {name}
      </text>
    );
  };
}

function pivotRows(rows: CompareRow[]): Array<{ bucket: string } & Record<string, number | string>> {
  const map = new Map<string, { bucket: string } & Record<string, number | string>>();
  for (const r of rows) {
    if (!map.has(r.bucket)) map.set(r.bucket, { bucket: r.bucket });
    map.get(r.bucket)![r.product_name] = r.avg_price;
  }
  return Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
}

/** "" はnull（未入力）、数値文字列はその数値、それ以外はエラーとして返す */
function parsePriceInput(text: string): number | null | "invalid" {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (Number.isNaN(n)) return "invalid";
  return Math.round(n);
}

interface ProductDraft {
  canonical_name: string;
  resale_notes: string;
  release_date: string;
  secondary_market_price_individual: string;
  secondary_market_trend_individual: string;
  secondary_market_price_buyback_shrink: string;
  secondary_market_trend_buyback_shrink: string;
  secondary_market_price_buyback_noshrink: string;
  secondary_market_trend_buyback_noshrink: string;
}

const PRICE_FIELDS = [
  { key: "secondary_market_price_individual", label: "個人間の目安価格" },
  { key: "secondary_market_price_buyback_shrink", label: "買取の目安価格（シュリンク有）" },
  { key: "secondary_market_price_buyback_noshrink", label: "買取の目安価格（シュリンク無）" },
] as const;

export default function ProductsPage() {
  const { data, error: loadError, mutate } = useSWR<{ products: ProductWithAliases[] }>(
    "/api/products",
    jsonFetcher
  );
  const products = useMemo(() => data?.products ?? [], [data]);

  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const [yearIndexOverride, setYearIndexOverride] = useState<number | null>(null);
  const [mergeFrom, setMergeFrom] = useState("");
  const [mergeInto, setMergeInto] = useState("");
  const [mergeMessage, setMergeMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [priceType, setPriceType] = useState<PriceType>("sell");
  const [trendYMin, setTrendYMin] = useState("");
  const [trendYMax, setTrendYMax] = useState("");
  const [trendXFrom, setTrendXFrom] = useState("");
  const [trendXTo, setTrendXTo] = useState("");
  const [compareSeries, setCompareSeries] = useState({ individual: true, buybackShrink: true, buybackNoshrink: false });
  const [shrinkView, setShrinkView] = useState<Record<string, ShrinkView>>({});
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);
  const [editing, setEditing] = useState<Record<string, ProductDraft>>({});
  const [editError, setEditError] = useState<string | null>(null);

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

  function startImageUpload(productId: string) {
    uploadTargetRef.current = productId;
    fileInputRef.current?.click();
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const productId = uploadTargetRef.current;
    e.target.value = ""; // 同じファイルを選び直しても発火するように毎回空に戻す
    if (!file || !productId) return;

    setImageError(null);
    setUploadingFor(productId);
    try {
      const { base64Data, mimeType } = await prepareImageForUpload(file);
      const res = await fetch(`/api/products/${productId}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Data, mimeType }),
      });
      await readJson(res);
      mutate();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "画像のアップロードに失敗しました");
    } finally {
      setUploadingFor(null);
    }
  }

  function startEdit(p: Product) {
    setEditError(null);
    setEditing((prev) => ({
      ...prev,
      [p.id]: {
        canonical_name: p.canonical_name,
        resale_notes: p.resale_notes ?? "",
        release_date: p.release_date ?? "",
        secondary_market_price_individual: p.secondary_market_price_individual != null ? String(p.secondary_market_price_individual) : "",
        secondary_market_trend_individual: p.secondary_market_trend_individual ?? "",
        secondary_market_price_buyback_shrink: p.secondary_market_price_buyback_shrink != null ? String(p.secondary_market_price_buyback_shrink) : "",
        secondary_market_trend_buyback_shrink: p.secondary_market_trend_buyback_shrink ?? "",
        secondary_market_price_buyback_noshrink: p.secondary_market_price_buyback_noshrink != null ? String(p.secondary_market_price_buyback_noshrink) : "",
        secondary_market_trend_buyback_noshrink: p.secondary_market_trend_buyback_noshrink ?? "",
      },
    }));
  }

  function cancelEdit(id: string) {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function saveEdit(id: string) {
    const draft = editing[id];
    if (!draft) return;
    setEditError(null);

    const parsedPrices: Record<string, number | null> = {};
    for (const { key, label } of PRICE_FIELDS) {
      const parsed = parsePriceInput(draft[key]);
      if (parsed === "invalid") {
        setEditError(`${label}は数値で入力してください`);
        return;
      }
      parsedPrices[key] = parsed;
    }

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonical_name: draft.canonical_name.trim(),
          resale_notes: draft.resale_notes.trim() || null,
          release_date: draft.release_date || null,
          secondary_market_price_individual: parsedPrices.secondary_market_price_individual,
          secondary_market_trend_individual: draft.secondary_market_trend_individual.trim() || null,
          secondary_market_price_buyback_shrink: parsedPrices.secondary_market_price_buyback_shrink,
          secondary_market_trend_buyback_shrink: draft.secondary_market_trend_buyback_shrink.trim() || null,
          secondary_market_price_buyback_noshrink: parsedPrices.secondary_market_price_buyback_noshrink,
          secondary_market_trend_buyback_noshrink: draft.secondary_market_trend_buyback_noshrink.trim() || null,
        }),
      });
      await readJson(res);
      cancelEdit(id);
      mutate();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "更新に失敗しました");
    }
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

  const secondaryCompareData = useMemo(
    () =>
      selectedProducts.map((p) => ({
        name: p.canonical_name,
        個人間: p.secondary_market_price_individual ?? undefined,
        "買取(有)": p.secondary_market_price_buyback_shrink ?? undefined,
        "買取(無)": p.secondary_market_price_buyback_noshrink ?? undefined,
      })),
    [selectedProducts]
  );
  const hasSecondaryData = secondaryCompareData.some((d) => d.個人間 != null || d["買取(有)"] != null || d["買取(無)"] != null);

  function toggleProduct(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function getShrinkView(productId: string): ShrinkView {
    return shrinkView[productId] ?? "shrink";
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
      <h1 className="text-xl font-bold">商品・相場比較</h1>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setVisibleCount(30);
        }}
        placeholder="商品名で絞り込み（全年代から検索）"
        className="w-full max-w-sm rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelected}
        className="hidden"
      />

      {loadError && <p className="text-sm text-red-500">{loadError.message}</p>}
      {imageError && <p className="text-sm text-red-500">{imageError}</p>}
      {editError && <p className="text-sm text-red-500">{editError}</p>}

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
          const draft = editing[p.id];
          const view = getShrinkView(p.id);
          const buybackPrice = view === "noshrink" && p.secondary_market_price_buyback_noshrink != null
            ? p.secondary_market_price_buyback_noshrink
            : p.secondary_market_price_buyback_shrink;
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
                  {draft ? (
                    <div className="space-y-1">
                      <input
                        value={draft.canonical_name}
                        onChange={(e) =>
                          setEditing((prev) => ({ ...prev, [p.id]: { ...draft, canonical_name: e.target.value } }))
                        }
                        placeholder="商品名"
                        className="w-full rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
                      />
                      <label className="flex items-center gap-2 text-xs opacity-70">
                        発売日
                        <input
                          type="date"
                          value={draft.release_date}
                          onChange={(e) =>
                            setEditing((prev) => ({ ...prev, [p.id]: { ...draft, release_date: e.target.value } }))
                          }
                          className="rounded border border-black/15 bg-transparent px-2 py-1 text-xs dark:border-white/20"
                        />
                      </label>
                      <textarea
                        value={draft.resale_notes}
                        onChange={(e) =>
                          setEditing((prev) => ({ ...prev, [p.id]: { ...draft, resale_notes: e.target.value } }))
                        }
                        placeholder="再販履歴等のメモ（任意）"
                        rows={2}
                        className="w-full rounded border border-black/15 bg-transparent px-2 py-1 text-xs dark:border-white/20"
                      />
                      <div className="space-y-1 rounded border border-black/10 p-2 dark:border-white/10">
                        <p className="text-[11px] font-medium opacity-60">2次流通（個人間）</p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={draft.secondary_market_price_individual}
                            onChange={(e) =>
                              setEditing((prev) => ({ ...prev, [p.id]: { ...draft, secondary_market_price_individual: e.target.value } }))
                            }
                            placeholder="目安価格"
                            className="w-32 rounded border border-black/15 bg-transparent px-2 py-1 text-xs dark:border-white/20"
                          />
                          <input
                            value={draft.secondary_market_trend_individual}
                            onChange={(e) =>
                              setEditing((prev) => ({ ...prev, [p.id]: { ...draft, secondary_market_trend_individual: e.target.value } }))
                            }
                            placeholder="傾向メモ"
                            className="flex-1 rounded border border-black/15 bg-transparent px-2 py-1 text-xs dark:border-white/20"
                          />
                        </div>
                        <p className="text-[11px] font-medium opacity-60">2次流通（買取・シュリンク有）</p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={draft.secondary_market_price_buyback_shrink}
                            onChange={(e) =>
                              setEditing((prev) => ({ ...prev, [p.id]: { ...draft, secondary_market_price_buyback_shrink: e.target.value } }))
                            }
                            placeholder="目安価格"
                            className="w-32 rounded border border-black/15 bg-transparent px-2 py-1 text-xs dark:border-white/20"
                          />
                          <input
                            value={draft.secondary_market_trend_buyback_shrink}
                            onChange={(e) =>
                              setEditing((prev) => ({ ...prev, [p.id]: { ...draft, secondary_market_trend_buyback_shrink: e.target.value } }))
                            }
                            placeholder="傾向メモ"
                            className="flex-1 rounded border border-black/15 bg-transparent px-2 py-1 text-xs dark:border-white/20"
                          />
                        </div>
                        <p className="text-[11px] font-medium opacity-60">2次流通（買取・シュリンク無）</p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={draft.secondary_market_price_buyback_noshrink}
                            onChange={(e) =>
                              setEditing((prev) => ({ ...prev, [p.id]: { ...draft, secondary_market_price_buyback_noshrink: e.target.value } }))
                            }
                            placeholder="目安価格"
                            className="w-32 rounded border border-black/15 bg-transparent px-2 py-1 text-xs dark:border-white/20"
                          />
                          <input
                            value={draft.secondary_market_trend_buyback_noshrink}
                            onChange={(e) =>
                              setEditing((prev) => ({ ...prev, [p.id]: { ...draft, secondary_market_trend_buyback_noshrink: e.target.value } }))
                            }
                            placeholder="傾向メモ"
                            className="flex-1 rounded border border-black/15 bg-transparent px-2 py-1 text-xs dark:border-white/20"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => saveEdit(p.id)} className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">
                          保存
                        </button>
                        <button onClick={() => cancelEdit(p.id)} className="text-xs hover:underline">
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Link href={`/products/${p.id}`} className="font-medium hover:underline">
                        {p.canonical_name}
                      </Link>
                      {p.release_date && <p className="text-xs opacity-40">発売日: {p.release_date}</p>}
                      {p.product_aliases.length > 0 && (
                        <p className="text-xs opacity-50">
                          表記ゆれ: {p.product_aliases.map((a) => a.alias_text).join(" / ")}
                        </p>
                      )}
                      {p.resale_notes && (
                        <p className="whitespace-pre-wrap text-xs opacity-50">再販: {p.resale_notes}</p>
                      )}
                      {p.secondary_market_price_individual != null && (
                        <p className="text-xs opacity-50">個人間: {formatYen(p.secondary_market_price_individual)}</p>
                      )}
                      {buybackPrice != null && (
                        <div className="flex items-center gap-2 text-xs opacity-50">
                          <span>
                            買取（{view === "noshrink" && p.secondary_market_price_buyback_noshrink != null ? "無" : "有"}）: {formatYen(buybackPrice)}
                          </span>
                          {p.secondary_market_price_buyback_noshrink != null && (
                            <button
                              type="button"
                              onClick={() =>
                                setShrinkView((prev) => ({ ...prev, [p.id]: getShrinkView(p.id) === "shrink" ? "noshrink" : "shrink" }))
                              }
                              className="rounded border border-black/15 px-1.5 py-0.5 text-[10px] hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                            >
                              {view === "noshrink" ? "有を見る" : "無を見る"}
                            </button>
                          )}
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => startImageUpload(p.id)}
                          disabled={uploadingFor === p.id}
                          className="text-xs opacity-60 hover:underline disabled:opacity-30"
                        >
                          {uploadingFor === p.id ? "アップロード中..." : p.has_image ? "画像を変更" : "画像を追加"}
                        </button>
                        <button type="button" onClick={() => startEdit(p)} className="text-xs opacity-60 hover:underline">
                          編集
                        </button>
                      </div>
                    </>
                  )}
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
            商品名の左にあるチェックボックスにチェックを入れると、ここに価格推移や2次流通の比較が棒グラフで表示されます。
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
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as Granularity)}
                className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
              >
                <option value="day">1日単位</option>
                <option value="year">年単位</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block opacity-60">価格区分</span>
              <select
                value={priceType}
                onChange={(e) => setPriceType(e.target.value as PriceType)}
                className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
              >
                <option value="sell">販売</option>
                <option value="buy">買取</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block opacity-60">期間（{granularity === "year" ? "年" : "日付"}・任意）From</span>
              <input
                value={trendXFrom}
                onChange={(e) => setTrendXFrom(e.target.value)}
                placeholder={granularity === "year" ? "2024" : "2026-01-01"}
                className="w-32 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block opacity-60">期間 To</span>
              <input
                value={trendXTo}
                onChange={(e) => setTrendXTo(e.target.value)}
                placeholder={granularity === "year" ? "2026" : "2026-12-31"}
                className="w-32 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block opacity-60">金額の範囲（円・任意）下限</span>
              <input
                type="number"
                value={trendYMin}
                onChange={(e) => setTrendYMin(e.target.value)}
                placeholder="自動"
                className="w-28 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block opacity-60">上限</span>
              <input
                type="number"
                value={trendYMax}
                onChange={(e) => setTrendYMax(e.target.value)}
                placeholder="自動"
                className="w-28 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
              />
            </label>
            {(trendXFrom || trendXTo || trendYMin || trendYMax) && (
              <button
                type="button"
                onClick={() => {
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
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="bucket" fontSize={12} />
                    <YAxis fontSize={12} domain={trendYDomain} tickFormatter={(v) => formatYen(v)} />
                    <Tooltip formatter={(v) => formatYen(v)} />
                    <Legend />
                    {selectedProducts.map((p, i) => (
                      <Bar key={p.id} dataKey={p.canonical_name} fill={colorForSeries(i, selectedProducts.length)}>
                        <LabelList dataKey={p.canonical_name} content={renderBarNameLabel(p.canonical_name)} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="mb-6 text-sm opacity-60">
              選択した商品・価格区分（{priceType === "sell" ? "販売" : "買取"}）の投稿データがまだありません。
            </p>
          )}

          <h3 className="mb-2 text-xs font-semibold opacity-70">2次流通の比較</h3>
          <div className="mb-3 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={compareSeries.individual}
                onChange={(e) => setCompareSeries((prev) => ({ ...prev, individual: e.target.checked }))}
              />
              個人間
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={compareSeries.buybackShrink}
                onChange={(e) => setCompareSeries((prev) => ({ ...prev, buybackShrink: e.target.checked }))}
              />
              買取（シュリンク有）
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={compareSeries.buybackNoshrink}
                onChange={(e) => setCompareSeries((prev) => ({ ...prev, buybackNoshrink: e.target.checked }))}
              />
              買取（シュリンク無）
            </label>
          </div>

          {hasSecondaryData ? (
            <div className="h-72 overflow-x-auto">
              <div className="h-full" style={{ minWidth: Math.max(secondaryCompareData.length * 100, 320) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={secondaryCompareData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={12} tickFormatter={(v) => formatYen(v)} />
                    <Tooltip formatter={(v) => formatYen(v as number)} />
                    <Legend />
                    {compareSeries.individual && <Bar dataKey="個人間" fill="#16a34a" />}
                    {compareSeries.buybackShrink && <Bar dataKey="買取(有)" fill="#2563eb" />}
                    {compareSeries.buybackNoshrink && <Bar dataKey="買取(無)" fill="#d97706" />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-sm opacity-60">選択した商品に2次流通データがまだありません。</p>
          )}
          </>
        )}
      </div>

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
