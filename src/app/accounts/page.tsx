"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { jsonFetcher, readJson } from "@/lib/api-client";
import type { Account } from "@/types/domain";

interface AccountDraft {
  handle: string;
  display_name: string;
  notes: string;
  url: string;
}

export default function AccountsPage() {
  const { data, error: loadError, isLoading, mutate } = useSWR<{ accounts: Account[] }>("/api/accounts", jsonFetcher);
  const accounts = data?.accounts ?? [];

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, AccountDraft>>({});

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: handle.trim(),
          display_name: displayName.trim(),
          notes: notes.trim() || null,
          url: url.trim() || null,
        }),
      });
      await readJson(res);
      setHandle("");
      setDisplayName("");
      setNotes("");
      setUrl("");
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

  function startEdit(a: Account) {
    setActionError(null);
    setEditing((prev) => ({
      ...prev,
      [a.id]: { handle: a.handle, display_name: a.display_name, notes: a.notes ?? "", url: a.url ?? "" },
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
    setActionError(null);
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: draft.handle.trim(),
          display_name: draft.display_name.trim(),
          notes: draft.notes.trim() || null,
          url: draft.url.trim() || null,
        }),
      });
      await readJson(res);
      cancelEdit(id);
      mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  }

  const error = actionError ?? (loadError ? loadError.message : null);
  const accountsWithUrl = accounts.filter((a) => a.url);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">アカウント管理</h1>

      {accountsWithUrl.length > 0 && (
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <h2 className="mb-1 text-sm font-semibold">アカウントページをまとめて開く</h2>
          <p className="mb-3 text-xs opacity-60">
            X側の通知ベル（🔔 すべてのポスト）でアカウントをフォローしておくと、新着があった時にここから1タップで確認しに行けます。
          </p>
          <div className="flex flex-wrap gap-2">
            {accountsWithUrl.map((a) => (
              <a
                key={a.id}
                href={a.url!}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                ↗ {a.display_name}
              </a>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} className="grid gap-3 rounded-lg border border-black/10 p-4 sm:grid-cols-2 dark:border-white/10">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Xハンドル</span>
          <input
            required
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@example_shop"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">表示名</span>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="◯◯トレカ店"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">アカウントのURL（任意）</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://x.com/example_shop"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">メモ（任意）</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        <div className="sm:col-span-2">
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
            const draft = editing[a.id];
            return (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                {draft ? (
                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    <label className="text-xs">
                      <span className="mb-1 block opacity-60">Xハンドル</span>
                      <input
                        value={draft.handle}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [a.id]: { ...draft, handle: e.target.value } }))}
                        className="w-full rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
                      />
                    </label>
                    <label className="text-xs">
                      <span className="mb-1 block opacity-60">表示名</span>
                      <input
                        value={draft.display_name}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [a.id]: { ...draft, display_name: e.target.value } }))}
                        className="w-full rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
                      />
                    </label>
                    <label className="text-xs">
                      <span className="mb-1 block opacity-60">アカウントのURL（任意）</span>
                      <input
                        type="url"
                        value={draft.url}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [a.id]: { ...draft, url: e.target.value } }))}
                        placeholder="https://x.com/example_shop"
                        className="w-full rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
                      />
                    </label>
                    <label className="text-xs">
                      <span className="mb-1 block opacity-60">メモ（任意）</span>
                      <input
                        value={draft.notes}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [a.id]: { ...draft, notes: e.target.value } }))}
                        className="w-full rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
                      />
                    </label>
                    <div className="sm:col-span-2 flex gap-3">
                      <button onClick={() => saveEdit(a.id)} className="text-xs text-emerald-600 hover:underline dark:text-emerald-400">
                        保存
                      </button>
                      <button onClick={() => cancelEdit(a.id)} className="text-xs hover:underline">
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Link href={`/accounts/${a.id}`} className="font-medium hover:underline">
                      {a.display_name}
                    </Link>
                    <span className="ml-2 text-sm opacity-60">{a.handle}</span>
                    {a.url && (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 inline-flex items-center gap-1 rounded-full border border-black/15 px-2 py-0.5 text-xs opacity-70 hover:bg-black/5 hover:opacity-100 dark:border-white/20 dark:hover:bg-white/10"
                      >
                        ↗ 開く
                      </a>
                    )}
                    {a.notes && <p className="text-xs opacity-50">{a.notes}</p>}
                  </div>
                )}
                {!draft && (
                  <div className="flex items-center gap-3">
                    <button onClick={() => startEdit(a)} className="text-sm hover:underline">
                      編集
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="text-sm text-red-500 hover:underline">
                      削除
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
