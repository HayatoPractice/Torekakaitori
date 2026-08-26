"use client";

import { useState } from "react";
import useSWR from "swr";
import { jsonFetcher } from "@/lib/api-client";
import { useSelectedAccounts } from "@/hooks/useSelectedAccounts";
import AccountCheckboxList from "@/components/AccountCheckboxList";
import type { Account, ExtractedItem, Post, PostImage } from "@/types/domain";

function todayLocalDate(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

interface PostWithRelations extends Post {
  accounts: { handle: string; display_name: string } | null;
  post_images: PostImage[];
  extracted_items: ExtractedItem[];
}

export default function EntriesPage() {
  const [date, setDate] = useState(todayLocalDate());
  const { selectedIds, toggle, setSelectedIds } = useSelectedAccounts();

  const { data: accountsData } = useSWR<{ accounts: Account[] }>("/api/accounts", jsonFetcher);
  const accounts = accountsData?.accounts ?? [];

  // 何もチェックしていない場合は「すべて」扱いにする
  const qs = new URLSearchParams({ date });
  if (selectedIds.length > 0) qs.set("account_ids", selectedIds.join(","));
  const { data: postsData, error, isLoading } = useSWR<{ posts: PostWithRelations[] }>(
    `/api/posts?${qs.toString()}`,
    jsonFetcher
  );
  const posts = postsData?.posts ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">日別に見る</h1>

      <div className="flex flex-wrap gap-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium">投稿日</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
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

      {error && <p className="text-sm text-red-500">{error.message}</p>}
      {isLoading && <p className="text-sm opacity-60">読み込み中...</p>}

      {!isLoading && posts.length === 0 && (
        <p className="text-sm opacity-60">この日に登録された投稿はありません。</p>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">
                {post.accounts?.display_name ?? "不明なアカウント"}
                <span className="ml-2 opacity-50">{post.accounts?.handle}</span>
              </span>
              <div className="flex items-center gap-2">
                {post.status === "error" && <span className="text-red-500">解析エラー</span>}
                {post.status === "pending" && <span className="opacity-50">解析中...</span>}
                {post.source_url && (
                  <a href={post.source_url} target="_blank" rel="noreferrer" className="text-xs opacity-60 hover:underline">
                    元投稿を開く
                  </a>
                )}
              </div>
            </div>

            {post.raw_text && <p className="mb-2 whitespace-pre-wrap text-sm opacity-80">{post.raw_text}</p>}

            {post.post_images.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {post.post_images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={`/api/images/${img.id}`}
                    alt=""
                    className="h-24 w-24 rounded-md object-cover"
                  />
                ))}
              </div>
            )}

            {post.extracted_items.length > 0 && (
              <table className="mt-2 w-full text-sm">
                <tbody>
                  {post.extracted_items.map((item) => (
                    <tr key={item.id} className="border-t border-black/5 dark:border-white/10">
                      <td className="py-1.5">{item.product_name_raw}</td>
                      <td className="py-1.5">{item.price_type === "buy" ? "買取" : "販売"}</td>
                      <td className="py-1.5">¥{item.price.toLocaleString()}</td>
                      <td className="py-1.5 text-xs opacity-60">
                        {item.review_status === "pending_review" ? "要確認" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
