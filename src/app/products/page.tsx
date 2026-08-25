"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { jsonFetcher, readJson } from "@/lib/api-client";
import type { Product, ProductAlias } from "@/types/domain";

interface ProductWithAliases extends Product {
  product_aliases: ProductAlias[];
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

  const filtered = products.filter((p) => p.canonical_name.toLowerCase().includes(search.toLowerCase()));

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

      {loadError && <p className="text-sm text-red-500">{loadError.message}</p>}

      <ul className="divide-y divide-black/5 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
        {filtered.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <Link href={`/products/${p.id}`} className="font-medium hover:underline">
                {p.canonical_name}
              </Link>
              {p.product_aliases.length > 0 && (
                <p className="text-xs opacity-50">
                  表記ゆれ: {p.product_aliases.map((a) => a.alias_text).join(" / ")}
                </p>
              )}
            </div>
            <span className="rounded bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
              {p.item_type === "box" ? "BOX" : p.item_type === "pack" ? "パック" : "その他"}
            </span>
          </li>
        ))}
        {filtered.length === 0 && <li className="px-4 py-3 text-sm opacity-60">商品がありません</li>}
      </ul>

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
