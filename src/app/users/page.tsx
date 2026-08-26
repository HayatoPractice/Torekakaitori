"use client";

import { useState } from "react";
import useSWR from "swr";
import { jsonFetcher, readJson } from "@/lib/api-client";
import type { User } from "@/lib/auth";

export default function UsersPage() {
  const { data: meData } = useSWR<{ user: User }>("/api/auth/me", jsonFetcher);
  const me = meData?.user;

  const { data, error: loadError, mutate } = useSWR<{ users: User[] }>(
    me?.is_admin ? "/api/users" : null,
    jsonFetcher
  );
  const users = data?.users ?? [];

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [resetDrafts, setResetDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "info" | "error"; text: string } | null>(null);

  if (meData && !me?.is_admin) {
    return <p className="text-sm text-red-500">このページは管理者のみ利用できます。</p>;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, is_admin: isAdmin }),
      });
      await readJson(res);
      setUsername("");
      setPassword("");
      setIsAdmin(false);
      setMessage({ kind: "info", text: "追加しました" });
      mutate();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "追加に失敗しました" });
    }
  }

  async function handleResetPassword(userId: string) {
    const newPassword = resetDrafts[userId];
    if (!newPassword) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      await readJson(res);
      setResetDrafts((prev) => ({ ...prev, [userId]: "" }));
      setMessage({ kind: "info", text: "パスワードをリセットしました" });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "リセットに失敗しました" });
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("このユーザーを削除しますか？")) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      await readJson(res);
      mutate();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "削除に失敗しました" });
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">ユーザー管理</h1>
      <p className="text-sm opacity-70">
        追加したユーザーには、ここで設定したユーザー名・パスワードを直接お伝えください。
        各ユーザーは「設定」画面から自分でパスワードを変更できます。
      </p>

      <form onSubmit={handleAdd} className="grid gap-3 rounded-lg border border-black/10 p-4 sm:grid-cols-4 dark:border-white/10">
        <label className="text-sm">
          <span className="mb-1 block font-medium">ユーザー名</span>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">初期パスワード（8文字以上）</span>
          <input
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="h-4 w-4" />
          <span>管理者にする</span>
        </label>
        <div className="flex items-end">
          <button type="submit" className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
            追加
          </button>
        </div>
      </form>

      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            message.kind === "error"
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {message.text}
        </div>
      )}
      {loadError && <p className="text-sm text-red-500">{loadError.message}</p>}

      <ul className="divide-y divide-black/5 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/10">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="text-sm">
              <span className="font-medium">{u.username}</span>
              {u.is_admin && <span className="ml-2 rounded bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">管理者</span>}
              {u.id === me?.id && <span className="ml-2 opacity-50">（自分）</span>}
            </div>
            <div className="flex items-center gap-2">
              <input
                placeholder="新しいパスワード"
                value={resetDrafts[u.id] ?? ""}
                onChange={(e) => setResetDrafts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                className="w-40 rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
              />
              <button onClick={() => handleResetPassword(u.id)} className="text-sm hover:underline">
                リセット
              </button>
              <button onClick={() => handleDelete(u.id)} className="text-sm text-red-500 hover:underline">
                削除
              </button>
            </div>
          </li>
        ))}
        {users.length === 0 && <li className="px-4 py-3 text-sm opacity-60">読み込み中...</li>}
      </ul>
    </div>
  );
}
