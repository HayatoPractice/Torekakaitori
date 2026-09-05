"use client";

import { use, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { jsonFetcher, readJson } from "@/lib/api-client";
import { normalizeDateInput } from "@/lib/date";
import { prepareImageForUpload } from "@/lib/file";
import { formatYen, parsePriceInput } from "@/lib/format";
import { useLegendToggle } from "@/hooks/useLegendToggle";
import type { Product } from "@/types/domain";

type Mode = "individual" | "buyback";
type ShrinkChoice = "shrink" | "noshrink" | "both";

interface ProductDraft {
  canonical_name: string;
  resale_notes: string;
  release_date: string;
  retail_price: string;
  secondary_market_price_individual: string;
  secondary_market_trend_individual: string;
  secondary_market_price_buyback_shrink: string;
  secondary_market_trend_buyback_shrink: string;
  secondary_market_price_buyback_noshrink: string;
  secondary_market_trend_buyback_noshrink: string;
}

const PRICE_FIELDS = [
  { key: "retail_price", label: "定価" },
  { key: "secondary_market_price_individual", label: "個人間の目安価格" },
  { key: "secondary_market_price_buyback_shrink", label: "買取の目安価格（シュリンク有）" },
  { key: "secondary_market_price_buyback_noshrink", label: "買取の目安価格（シュリンク無）" },
] as const;

interface TrendPoint {
  date: string;
  price: number;
  price_type: "sell" | "buy";
  account: string;
}
interface RankingRow {
  account: string;
  price_type: "sell" | "buy";
  price: number;
}

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

interface SecondaryHistoryPoint {
  date: string;
  individual: number | null;
  buyback_shrink: number | null;
  buyback_noshrink: number | null;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, mutate } = useSWR<{
    product: Product;
    trend: TrendPoint[];
    ranking: RankingRow[];
    secondaryHistory: SecondaryHistoryPoint[];
  }>(`/api/summary/products/${id}`, jsonFetcher);
  const product = data?.product ?? null;
  const trend = useMemo(() => data?.trend ?? [], [data]);
  const ranking = data?.ranking ?? [];
  const secondaryHistory = useMemo(
    () =>
      (data?.secondaryHistory ?? []).map((h) => ({
        date: h.date,
        個人間: h.individual ?? undefined,
        "買取(有)": h.buyback_shrink ?? undefined,
        "買取(無)": h.buyback_noshrink ?? undefined,
      })),
    [data]
  );

  const chartDataAll = useMemo(() => {
    const byDate = new Map<string, { date: string; 販売?: number; 買取?: number; sellCount: number; buyCount: number }>();
    for (const p of trend) {
      if (!byDate.has(p.date)) byDate.set(p.date, { date: p.date, sellCount: 0, buyCount: 0 });
      const row = byDate.get(p.date)!;
      if (p.price_type === "sell") {
        row.販売 = ((row.販売 ?? 0) * row.sellCount + p.price) / (row.sellCount + 1);
        row.sellCount += 1;
      } else {
        row.買取 = ((row.買取 ?? 0) * row.buyCount + p.price) / (row.buyCount + 1);
        row.buyCount += 1;
      }
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [trend]);

  const salesLegend = useLegendToggle();
  const historyLegend = useLegendToggle();

  const [xFrom, setXFrom] = useState("");
  const [xTo, setXTo] = useState("");
  const [yMin, setYMin] = useState("");
  const [yMax, setYMax] = useState("");
  const chartData = useMemo(() => {
    const from = normalizeDateInput(xFrom);
    const to = normalizeDateInput(xTo);
    return chartDataAll.filter((row) => (!from || row.date >= from) && (!to || row.date <= to));
  }, [chartDataAll, xFrom, xTo]);
  const yDomain: [number | "auto", number | "auto"] = [yMin.trim() ? Number(yMin) : "auto", yMax.trim() ? Number(yMax) : "auto"];

  const sellRanking = ranking.filter((r) => r.price_type === "sell").sort((a, b) => a.price - b.price);
  const buyRanking = ranking.filter((r) => r.price_type === "buy").sort((a, b) => b.price - a.price);
  const latestDate = trend.length > 0 ? trend[trend.length - 1].date : null;

  const hasIndividual = product?.secondary_market_price_individual != null;
  const hasBuybackShrink = product?.secondary_market_price_buyback_shrink != null;
  const hasBuybackNoshrink = product?.secondary_market_price_buyback_noshrink != null;
  const hasSecondaryData = hasIndividual || hasBuybackShrink || hasBuybackNoshrink;

  const [mode, setMode] = useState<Mode>(hasIndividual ? "individual" : "buyback");
  const [shrinkChoice, setShrinkChoice] = useState<ShrinkChoice>("shrink");

  const [editing, setEditing] = useState<ProductDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    if (!product) return;
    setEditError(null);
    setEditing({
      canonical_name: product.canonical_name,
      resale_notes: product.resale_notes ?? "",
      release_date: product.release_date ?? "",
      retail_price: product.retail_price != null ? String(product.retail_price) : "",
      secondary_market_price_individual: product.secondary_market_price_individual != null ? String(product.secondary_market_price_individual) : "",
      secondary_market_trend_individual: product.secondary_market_trend_individual ?? "",
      secondary_market_price_buyback_shrink: product.secondary_market_price_buyback_shrink != null ? String(product.secondary_market_price_buyback_shrink) : "",
      secondary_market_trend_buyback_shrink: product.secondary_market_trend_buyback_shrink ?? "",
      secondary_market_price_buyback_noshrink: product.secondary_market_price_buyback_noshrink != null ? String(product.secondary_market_price_buyback_noshrink) : "",
      secondary_market_trend_buyback_noshrink: product.secondary_market_trend_buyback_noshrink ?? "",
    });
  }

  async function saveEdit() {
    if (!editing) return;
    setEditError(null);

    const parsedPrices: Record<string, number | null> = {};
    for (const { key, label } of PRICE_FIELDS) {
      const parsed = parsePriceInput(editing[key]);
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
          canonical_name: editing.canonical_name.trim(),
          resale_notes: editing.resale_notes.trim() || null,
          release_date: editing.release_date || null,
          retail_price: parsedPrices.retail_price,
          secondary_market_price_individual: parsedPrices.secondary_market_price_individual,
          secondary_market_trend_individual: editing.secondary_market_trend_individual.trim() || null,
          secondary_market_price_buyback_shrink: parsedPrices.secondary_market_price_buyback_shrink,
          secondary_market_trend_buyback_shrink: editing.secondary_market_trend_buyback_shrink.trim() || null,
          secondary_market_price_buyback_noshrink: parsedPrices.secondary_market_price_buyback_noshrink,
          secondary_market_trend_buyback_noshrink: editing.secondary_market_trend_buyback_noshrink.trim() || null,
        }),
      });
      await readJson(res);
      setEditing(null);
      mutate();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError(null);
    setUploading(true);
    try {
      const { base64Data, mimeType } = await prepareImageForUpload(file);
      const res = await fetch(`/api/products/${id}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Data, mimeType }),
      });
      await readJson(res);
      mutate();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "画像のアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  if (error) return <p className="text-sm text-red-500">{error.message}</p>;
  if (!product) return <p className="text-sm opacity-60">読み込み中...</p>;

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelected} className="hidden" />
      {editError && <p className="text-sm text-red-500">{editError}</p>}
      {imageError && <p className="text-sm text-red-500">{imageError}</p>}

      {editing ? (
        <div className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">商品名</span>
            <input
              value={editing.canonical_name}
              onChange={(e) => setEditing({ ...editing, canonical_name: e.target.value })}
              className="w-full rounded border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">発売日</span>
            <input
              type="date"
              value={editing.release_date}
              onChange={(e) => setEditing({ ...editing, release_date: e.target.value })}
              className="rounded border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">定価（税込・円）</span>
            <input
              type="number"
              value={editing.retail_price}
              onChange={(e) => setEditing({ ...editing, retail_price: e.target.value })}
              placeholder="未設定"
              className="w-32 rounded border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">再販履歴等のメモ（任意）</span>
            <textarea
              value={editing.resale_notes}
              onChange={(e) => setEditing({ ...editing, resale_notes: e.target.value })}
              rows={2}
              className="w-full rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
            />
          </label>
          <div className="space-y-2 rounded border border-black/10 p-3 dark:border-white/10">
            <p className="text-xs font-semibold opacity-70">2次流通（個人間）</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                value={editing.secondary_market_price_individual}
                onChange={(e) => setEditing({ ...editing, secondary_market_price_individual: e.target.value })}
                placeholder="目安価格"
                className="w-32 rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
              />
              <input
                value={editing.secondary_market_trend_individual}
                onChange={(e) => setEditing({ ...editing, secondary_market_trend_individual: e.target.value })}
                placeholder="傾向メモ"
                className="flex-1 rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
              />
            </div>
            <p className="text-xs font-semibold opacity-70">2次流通（買取・シュリンク有）</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                value={editing.secondary_market_price_buyback_shrink}
                onChange={(e) => setEditing({ ...editing, secondary_market_price_buyback_shrink: e.target.value })}
                placeholder="目安価格"
                className="w-32 rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
              />
              <input
                value={editing.secondary_market_trend_buyback_shrink}
                onChange={(e) => setEditing({ ...editing, secondary_market_trend_buyback_shrink: e.target.value })}
                placeholder="傾向メモ"
                className="flex-1 rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
              />
            </div>
            <p className="text-xs font-semibold opacity-70">2次流通（買取・シュリンク無）</p>
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                value={editing.secondary_market_price_buyback_noshrink}
                onChange={(e) => setEditing({ ...editing, secondary_market_price_buyback_noshrink: e.target.value })}
                placeholder="目安価格"
                className="w-32 rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
              />
              <input
                value={editing.secondary_market_trend_buyback_noshrink}
                onChange={(e) => setEditing({ ...editing, secondary_market_trend_buyback_noshrink: e.target.value })}
                placeholder="傾向メモ"
                className="flex-1 rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-30 dark:border-white/20 dark:hover:bg-white/10"
            >
              {uploading ? "アップロード中..." : product.has_image ? "画像を変更" : "画像を追加"}
            </button>
            <button type="button" onClick={saveEdit} className="rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-background">
              保存
            </button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {product.has_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/products/${id}/image`}
                alt=""
                className="h-16 w-16 shrink-0 rounded-md object-cover"
              />
            )}
            <div>
              <h1 className="text-xl font-bold">{product.canonical_name}</h1>
              {product.release_date && <p className="text-xs opacity-40">発売日: {product.release_date}</p>}
              {product.retail_price != null && <p className="text-xs opacity-40">定価: {formatYen(product.retail_price)}</p>}
              {product.resale_notes && (
                <p className="whitespace-pre-wrap text-xs opacity-60">再販: {product.resale_notes}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startEdit}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              編集
            </button>
            <a
              href={`/api/export/csv?product_id=${id}`}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              この商品のCSVを出力
            </a>
          </div>
        </div>
      )}

      {latestDate && (
        <p className="text-xs opacity-50">最新データ：{latestDate}（{daysAgo(latestDate)}日前）</p>
      )}

      {chartData.length > 0 || hasSecondaryData ? (
        <div className="space-y-2">
          {hasSecondaryData && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex overflow-hidden rounded-md border border-black/15 dark:border-white/20">
                <button
                  type="button"
                  disabled={!hasIndividual}
                  onClick={() => setMode("individual")}
                  className={`px-2.5 py-1 disabled:opacity-30 ${mode === "individual" ? "bg-foreground text-background" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
                >
                  個人間
                </button>
                <button
                  type="button"
                  disabled={!hasBuybackShrink && !hasBuybackNoshrink}
                  onClick={() => setMode("buyback")}
                  className={`px-2.5 py-1 disabled:opacity-30 ${mode === "buyback" ? "bg-foreground text-background" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
                >
                  買取
                </button>
              </div>
              {mode === "buyback" && (
                <div className="flex overflow-hidden rounded-md border border-black/15 dark:border-white/20">
                  <button
                    type="button"
                    disabled={!hasBuybackShrink}
                    onClick={() => setShrinkChoice("shrink")}
                    className={`px-2.5 py-1 disabled:opacity-30 ${shrinkChoice === "shrink" ? "bg-foreground text-background" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
                  >
                    有
                  </button>
                  <button
                    type="button"
                    disabled={!hasBuybackNoshrink}
                    onClick={() => setShrinkChoice("noshrink")}
                    className={`px-2.5 py-1 disabled:opacity-30 ${shrinkChoice === "noshrink" ? "bg-foreground text-background" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
                  >
                    無
                  </button>
                  <button
                    type="button"
                    disabled={!hasBuybackShrink || !hasBuybackNoshrink}
                    onClick={() => setShrinkChoice("both")}
                    className={`px-2.5 py-1 disabled:opacity-30 ${shrinkChoice === "both" ? "bg-foreground text-background" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
                  >
                    両方比較
                  </button>
                </div>
              )}
            </div>
          )}
          {hasSecondaryData && (
            <p className="text-[11px] opacity-40">
              情報源：個人間はPRICE BASE情報局（フリマ実売ベース）、買取は
              {product.canonical_name.startsWith("ワンピースカード")
                ? "トレカの地図"
                : "ポケカチ・pokeca-box-hikaku.com"}
              （店舗買取ベース）を突き合わせて調査
            </p>
          )}
          <div className="flex flex-wrap items-end gap-3 text-xs">
            <label>
              <span className="mb-1 block opacity-60">期間 From</span>
              <input
                value={xFrom}
                onChange={(e) => setXFrom(e.target.value)}
                placeholder="2026-1-1 等"
                className="w-32 rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label>
              <span className="mb-1 block opacity-60">To</span>
              <input
                value={xTo}
                onChange={(e) => setXTo(e.target.value)}
                placeholder="2026年12月31日 等"
                className="w-36 rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label>
              <span className="mb-1 block opacity-60">金額 下限</span>
              <input
                type="number"
                value={yMin}
                onChange={(e) => setYMin(e.target.value)}
                placeholder="自動"
                className="w-24 rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            <label>
              <span className="mb-1 block opacity-60">上限</span>
              <input
                type="number"
                value={yMax}
                onChange={(e) => setYMax(e.target.value)}
                placeholder="自動"
                className="w-24 rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
              />
            </label>
            {(xFrom || xTo || yMin || yMax) && (
              <button
                type="button"
                onClick={() => {
                  setXFrom("");
                  setXTo("");
                  setYMin("");
                  setYMax("");
                }}
                className="rounded border border-black/15 px-2 py-1 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                範囲指定を解除
              </button>
            )}
          </div>
          <div className="h-72 rounded-lg border border-black/10 p-4 dark:border-white/10">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} domain={yDomain} tickFormatter={(v) => formatYen(v)} />
                <Tooltip formatter={(v) => formatYen(v)} />
                <Legend onClick={salesLegend.onLegendClick} formatter={salesLegend.legendFormatter} />
                <Line type="monotone" dataKey="販売" stroke="#2563eb" connectNulls dot={{ r: 3 }} hide={salesLegend.isHidden("販売")} />
                <Line type="monotone" dataKey="買取" stroke="#dc2626" connectNulls dot={{ r: 3 }} hide={salesLegend.isHidden("買取")} />
                {mode === "individual" && hasIndividual && (
                  <ReferenceLine
                    y={product.secondary_market_price_individual!}
                    stroke="#16a34a"
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                    label={{ value: "個人間", position: "insideTopRight", fill: "#16a34a", fontSize: 11 }}
                  />
                )}
                {mode === "buyback" && (shrinkChoice === "shrink" || shrinkChoice === "both") && hasBuybackShrink && (
                  <ReferenceLine
                    y={product.secondary_market_price_buyback_shrink!}
                    stroke="#16a34a"
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                    label={{ value: "買取(有)", position: "insideTopRight", fill: "#16a34a", fontSize: 11 }}
                  />
                )}
                {mode === "buyback" && (shrinkChoice === "noshrink" || shrinkChoice === "both") && hasBuybackNoshrink && (
                  <ReferenceLine
                    y={product.secondary_market_price_buyback_noshrink!}
                    stroke="#d97706"
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                    label={{ value: "買取(無)", position: "insideBottomRight", fill: "#d97706", fontSize: 11 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          {mode === "individual" && hasIndividual && (
            <p className="text-xs opacity-60">
              個人間の目安価格：{formatYen(product.secondary_market_price_individual!)}
              {product.secondary_market_trend_individual && `（${product.secondary_market_trend_individual}）`}
              {product.secondary_market_checked_at && `　※${product.secondary_market_checked_at.slice(0, 10)}時点の調査`}
            </p>
          )}
          {mode === "buyback" && (shrinkChoice === "shrink" || shrinkChoice === "both") && hasBuybackShrink && (
            <p className="text-xs opacity-60">
              買取（有）の目安価格：{formatYen(product.secondary_market_price_buyback_shrink!)}
              {product.secondary_market_trend_buyback_shrink && `（${product.secondary_market_trend_buyback_shrink}）`}
              {product.secondary_market_checked_at && `　※${product.secondary_market_checked_at.slice(0, 10)}時点の調査`}
            </p>
          )}
          {mode === "buyback" && (shrinkChoice === "noshrink" || shrinkChoice === "both") && hasBuybackNoshrink && (
            <p className="text-xs opacity-60">
              買取（無）の目安価格：{formatYen(product.secondary_market_price_buyback_noshrink!)}
              {product.secondary_market_trend_buyback_noshrink && `（${product.secondary_market_trend_buyback_noshrink}）`}
              {product.secondary_market_checked_at && `　※${product.secondary_market_checked_at.slice(0, 10)}時点の調査`}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm opacity-60">価格推移データがまだありません。</p>
      )}

      {hasSecondaryData && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">2次流通の推移</h2>
          {secondaryHistory.length > 0 ? (
            <>
              <div className="h-56 rounded-lg border border-black/10 p-4 dark:border-white/10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={secondaryHistory}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => formatYen(v)} />
                    <Tooltip formatter={(v) => formatYen(v)} />
                    <Legend onClick={historyLegend.onLegendClick} formatter={historyLegend.legendFormatter} />
                    <Line type="monotone" dataKey="個人間" stroke="#16a34a" connectNulls dot={{ r: 3 }} hide={historyLegend.isHidden("個人間")} />
                    <Line type="monotone" dataKey="買取(有)" stroke="#2563eb" connectNulls dot={{ r: 3 }} hide={historyLegend.isHidden("買取(有)")} />
                    <Line type="monotone" dataKey="買取(無)" stroke="#d97706" connectNulls dot={{ r: 3 }} hide={historyLegend.isHidden("買取(無)")} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs opacity-50">
                記録開始日：{secondaryHistory[0].date}
                {secondaryHistory.length === 1 && "（記録が1件のみのため、まだ推移としては見えません。次回の更新以降、線としてつながります）"}
                　※発売当初からの過去データは情報源側に存在しないため取得できません。ここでは価格が更新されるたびの記録のみを表示しています。
              </p>
            </>
          ) : (
            <p className="text-xs opacity-50">
              まだ記録がありません。次回、価格が更新されたタイミングから記録が始まります（発売当初からの過去データは情報源側に存在しないため取得できません）。
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <h2 className="mb-2 text-sm font-semibold">販売が安い順</h2>
          {sellRanking.length === 0 ? (
            <p className="text-sm opacity-60">データなし</p>
          ) : (
            <ol className="space-y-1 text-sm">
              {sellRanking.map((r, i) => (
                <li key={`${r.account}-${i}`} className="flex justify-between gap-2">
                  <span className="min-w-0 break-words">
                    {i + 1}. {r.account}
                  </span>
                  <span className="shrink-0">{formatYen(r.price)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <h2 className="mb-2 text-sm font-semibold">買取が高い順</h2>
          {buyRanking.length === 0 ? (
            <p className="text-sm opacity-60">データなし</p>
          ) : (
            <ol className="space-y-1 text-sm">
              {buyRanking.map((r, i) => (
                <li key={`${r.account}-${i}`} className="flex justify-between gap-2">
                  <span className="min-w-0 break-words">
                    {i + 1}. {r.account}
                  </span>
                  <span className="shrink-0">{formatYen(r.price)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
