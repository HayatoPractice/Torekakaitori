"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { jsonFetcher, readJson } from "@/lib/api-client";
import { fileToBase64 } from "@/lib/file";
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

/** 棒グラフの色（選択商品数ぶん順番に使う。8色を超えたら循環させる） */
const BAR_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];

function pivotRows(rows: CompareRow[]): Array<{ bucket: string } & Record<string, number | string>> {
  const map = new Map<string, { bucket: string } & Record<string, number | string>>();
  for (const r of rows) {
    if (!map.has(r.bucket)) map.set(r.bucket, { bucket: r.bucket });
    map.get(r.bucket)![r.product_name] = r.avg_price;
  }
  return Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
}

export default function ProductsPage() {
  const { data, error: loadError, mutate } = useSWR<{ products: ProductWithAliases[] }>(
    "/api/products",
    jsonFetcher
  );
  const products = data?.products ?? [];

  const [search, setSearch] = useState("");
  const [mergeFrom, setMergeFrom] = useState("");
  const [mergeInto, setMergeInto] = useState("");
  const [mergeMessage, setMergeMessage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [priceType, setPriceType] = useState<PriceType>("sell");
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);

  const filtered = products.filter((p) => p.canonical_name.toLowerCase().includes(search.toLowerCase()));
  const selectedProducts = products.filter((p) => selectedIds.includes(p.id));

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
      const base64Data = await fileToBase64(file);
      const res = await fetch(`/api/products/${productId}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Data, mimeType: file.type }),
      });
      await readJson(res);
      mutate();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "画像のアップロードに失敗しました");
    } finally {
      setUploadingFor(null);
    }
  }

  const compareQs = new URLSearchParams({ product_ids: selectedIds.join(","), granularity, price_type: priceType });
  const { data: compareData, error: compareError } = useSWR<{ rows: CompareRow[] }>(
    selectedIds.length > 0 ? `/api/summary/products/compare?${compareQs.toString()}` : null,
    jsonFetcher
  );
  const chartData = useMemo(() => pivotRows(compareData?.rows ?? []), [compareData]);

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
      <h1 className="text-xl font-bold">商品・相場比較</h1>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="商品名で絞り込み"
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

      <ul className="divide-y divide-black/5 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
        {filtered.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div className="flex min-w-0 items-start gap-2">
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
              <div className="min-w-0">
                <Link href={`/products/${p.id}`} className="font-medium hover:underline">
                  {p.canonical_name}
                </Link>
                {p.product_aliases.length > 0 && (
                  <p className="text-xs opacity-50">
                    表記ゆれ: {p.product_aliases.map((a) => a.alias_text).join(" / ")}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => startImageUpload(p.id)}
                  disabled={uploadingFor === p.id}
                  className="block text-xs opacity-60 hover:underline disabled:opacity-30"
                >
                  {uploadingFor === p.id ? "アップロード中..." : p.has_image ? "画像を変更" : "画像を追加"}
                </button>
              </div>
            </div>
            <span className="shrink-0 rounded bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
              {p.item_type === "box" ? "BOX" : p.item_type === "pack" ? "パック" : "その他"}
            </span>
          </li>
        ))}
        {filtered.length === 0 && <li className="px-4 py-3 text-sm opacity-60">商品がありません</li>}
      </ul>

      {selectedIds.length > 0 && (
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">選択した商品のトレンド比較（{selectedProducts.length}件）</h2>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs opacity-60 hover:underline"
            >
              選択解除
            </button>
          </div>

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
          </div>

          {compareError && <p className="text-sm text-red-500">{compareError.message}</p>}

          {chartData.length > 0 ? (
            <div className="h-80 overflow-x-auto">
              <div className="h-full" style={{ minWidth: Math.max(chartData.length * 60, 320) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="bucket" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => formatYen(v)} />
                    <Tooltip formatter={(v) => formatYen(v)} />
                    <Legend />
                    {selectedProducts.map((p, i) => (
                      <Bar key={p.id} dataKey={p.canonical_name} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <p className="text-sm opacity-60">
              選択した商品・価格区分（{priceType === "sell" ? "販売" : "買取"}）の価格データがまだありません。
            </p>
          )}
        </div>
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
