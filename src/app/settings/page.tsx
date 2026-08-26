"use client";

import { useState } from "react";
import { readJson } from "@/lib/api-client";

export default function SettingsPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "info" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (password !== passwordConfirm) {
      setMessage({ kind: "error", text: "パスワード（確認）が一致しません" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      await readJson(res);
      setMessage({
        kind: "info",
        text: "変更しました。次回アクセス時から新しいユーザー名・パスワードが必要になります。",
      });
      setUsername("");
      setPassword("");
      setPasswordConfirm("");
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "変更に失敗しました" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-bold">ログイン情報の変更</h1>
        <p className="mt-1 text-sm opacity-70">
          このアプリを開くときに求められるユーザー名・パスワードを変更します。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-black/10 p-4 dark:border-white/10">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">新しいユーザー名</span>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">新しいパスワード（8文字以上）</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">新しいパスワード（確認）</span>
          <input
            required
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {submitting ? "変更中..." : "変更する"}
        </button>
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
    </div>
  );
}
