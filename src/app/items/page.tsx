"use client";

import { useState } from "react";
import useSWR from "swr";
import { jsonFetcher, readJson } from "@/lib/api-client";
import { useSelectedAccounts } from "@/hooks/useSelectedAccounts";
import AccountCheckboxList from "@/components/AccountCheckboxList";
import type { Account, ExtractedItem, ReviewStatus } from "@/types/domain";

interface ItemView extends ExtractedItem {
  accounts: { handle: string; display_name: string } | null;
  posts: { posted_date: string; source_url: string | null } | null;
  products: { canonical_name: string } | null;
}

const STATUS_LABEL: Record<ReviewStatus, string> = {
  confirmed: "確定",
  pending_review: "要確認",
  rejected: "却下",
};

export default function ItemsPage() {
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "">("pending_review");
  const [actionError, setActionError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, { product_name_raw: string; price: number }>>({});
  const { selectedIds, toggle, setSelectedIds } = useSelectedAccounts();

  const { data: accountsData } = useSWR<{ accounts: Account[] }>("/api/accounts", jsonFetcher);
  const accounts = accountsData?.accounts ?? [];

  const qsParams = new URLSearchParams();
  if (statusFilter) qsParams.set("review_status", statusFilter);
  if (selectedIds.length > 0) qsParams.set("account_ids", selectedIds.join(","));
  const { data, error: loadError, isLoading, mutate } = useSWR<{ items: ItemView[] }>(
    `/api/items?${qsParams.toString()}`,
    jsonFetcher
  );
  const items = data?.items ?? [];
  const error = actionError ?? (loadError ? loadError.message : null);

  async function updateItem(id: string, patch: Record<string, unknown>) {
    setActionError(null);
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await readJson(res);
      mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  }

  function startEdit(item: ItemView) {
    setEditing((prev) => ({ ...prev, [item.id]: { product_name_raw: item.product_name_raw, price: item.price } }));
  }

  function saveEdit(id: string) {
    const draft = editing[id];
    if (!draft) return;
    updateItem(id, { product_name_raw: draft.product_name_raw, price: draft.price });
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">レビュー・一覧</h1>
        <a
          href="/api/export/csv"
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          CSVエクスポート
        </a>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex gap-2">
          {(["pending_review", "confirmed", "rejected", ""] as const).map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                statusFilter === s ? "bg-foreground text-background" : "border border-black/15 dark:border-white/20"
              }`}
            >
              {s ? STATUS_LABEL[s] : "すべて"}
            </button>
          ))}
        </div>
        <div className="w-full max-w-xs sm:w-64">
          <AccountCheckboxList
            accounts={accounts}
            selectedIds={selectedIds}
            onToggle={toggle}
            onSelectAll={() => setSelectedIds(accounts.map((a) => a.id))}
            onClearAll={() => setSelectedIds([])}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {isLoading ? (
        <p className="text-sm opacity-60">読み込み中...</p>
      ) : items.length === 0 ? (
        <p className="text-sm opacity-60">該当するアイテムはありません。</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left opacity-60 dark:border-white/10">
                <th className="px-3 py-2">投稿日</th>
                <th className="px-3 py-2">アカウント</th>
                <th className="px-3 py-2">商品名</th>
                <th className="px-3 py-2">種別</th>
                <th className="px-3 py-2">価格</th>
                <th className="px-3 py-2">確信度</th>
                <th className="px-3 py-2">状態</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const draft = editing[item.id];
                return (
                  <tr key={item.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                    <td className="px-3 py-2 whitespace-nowrap">{item.posts?.posted_date}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.accounts?.display_name}</td>
                    <td className="px-3 py-2">
                      {draft ? (
                        <input
                          value={draft.product_name_raw}
                          onChange={(e) =>
                            setEditing((prev) => ({ ...prev, [item.id]: { ...draft, product_name_raw: e.target.value } }))
                          }
                          className="w-full rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
                        />
                      ) : (
                        item.products?.canonical_name ?? item.product_name_raw
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.price_type === "buy" ? "買取" : "販売"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {draft ? (
                        <input
                          type="number"
                          value={draft.price}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [item.id]: { ...draft, price: Number(e.target.value) } }))}
                          className="w-24 rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
                        />
                      ) : (
                        `¥${item.price.toLocaleString()}`
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{Math.round(item.confidence * 100)}%</td>
                    <td className="px-3 py-2 whitespace-nowrap">{STATUS_LABEL[item.review_status]}</td>
                    <td className="px-3 py-2 whitespace-nowrap space-x-2">
                      {draft ? (
                        <button onClick={() => saveEdit(item.id)} className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">
                          保存
                        </button>
                      ) : (
                        <button onClick={() => startEdit(item)} className="text-xs hover:underline">
                          修正
                        </button>
                      )}
                      {item.review_status !== "confirmed" && (
                        <button
                          onClick={() => updateItem(item.id, { review_status: "confirmed" })}
                          className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          確定
                        </button>
                      )}
                      {item.review_status !== "rejected" && (
                        <button
                          onClick={() => updateItem(item.id, { review_status: "rejected" })}
                          className="text-xs text-red-500 hover:underline"
                        >
                          却下
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
