"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { jsonFetcher, readJson } from "@/lib/api-client";
import type { Account } from "@/types/domain";
import type { User } from "@/lib/auth";

export default function AccountsPage() {
  const { data, error: loadError, isLoading, mutate } = useSWR<{ accounts: Account[] }>("/api/accounts", jsonFetcher);
  const accounts = data?.accounts ?? [];
  const { data: meData } = useSWR<{ user: User }>("/api/auth/me", jsonFetcher);
  const isAdmin = meData?.user.is_admin ?? false;

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: handle.trim(), display_name: displayName.trim(), notes: notes.trim() || null }),
      });
      await readJson(res);
      setHandle("");
      setDisplayName("");
      setNotes("");
      mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "登録に失敗しました");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("このアカウントを削除しますか？紐づく投稿・価格データも削除されます。")) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      await readJson(res);
      mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  }

  async function handleToggleShared(a: Account) {
    setActionError(null);
    try {
      const res = await fetch(`/api/accounts/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_shared: !a.is_shared }),
      });
      await readJson(res);
      mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "変更に失敗しました");
    }
  }

  const error = actionError ?? (loadError ? loadError.message : null);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">アカウント管理</h1>

      <form onSubmit={handleAdd} className="grid gap-3 rounded-lg border border-black/10 p-4 sm:grid-cols-3 dark:border-white/10">
        <label className="text-sm sm:col-span-1">
          <span className="mb-1 block font-medium">Xハンドル</span>
          <input
            required
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@example_shop"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="text-sm sm:col-span-1">
          <span className="mb-1 block font-medium">表示名</span>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="◯◯トレカ店"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="text-sm sm:col-span-1">
          <span className="mb-1 block font-medium">メモ（任意）</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        <div className="sm:col-span-3">
          <button type="submit" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
            追加
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {isLoading ? (
        <p className="text-sm opacity-60">読み込み中...</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm opacity-60">アカウントが未登録です。上のフォームから追加してください。</p>
      ) : (
        <ul className="divide-y divide-black/5 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
          {accounts.map((a) => {
            const canManage = a.is_mine || isAdmin;
            return (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <Link href={`/accounts/${a.id}`} className="font-medium hover:underline">
                    {a.display_name}
                  </Link>
                  <span className="ml-2 text-sm opacity-60">{a.handle}</span>
                  {!a.is_mine && <span className="ml-2 rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">共有</span>}
                  {a.notes && <p className="text-xs opacity-50">{a.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={a.is_shared}
                      disabled={!canManage}
                      onChange={() => handleToggleShared(a)}
                      className="h-4 w-4"
                    />
                    <span className={canManage ? "" : "opacity-50"}>共有する</span>
                  </label>
                  {canManage && (
                    <button onClick={() => handleDelete(a.id)} className="text-sm text-red-500 hover:underline">
                      削除
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
