"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { jsonFetcher, readJson } from "@/lib/api-client";
import type { Account, ExtractedItem } from "@/types/domain";

function todayLocalDate(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

interface PendingImage {
  file: File;
  base64Data: string;
  mimeType: string;
  previewUrl: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function DashboardForm() {
  const searchParams = useSearchParams();
  const { data: accountsData, error: accountsError } = useSWR<{ accounts: Account[] }>("/api/accounts", jsonFetcher);
  const accounts = accountsData?.accounts ?? [];

  // ブックマークレットからの遷移（?url=...&text=...&account=...）でフォームを事前入力する
  const [accountId, setAccountId] = useState(() => searchParams.get("account") ?? "");
  const [postedDate, setPostedDate] = useState(todayLocalDate());
  const [sourceUrl, setSourceUrl] = useState(() => searchParams.get("url") ?? "");
  const [rawText, setRawText] = useState(() => searchParams.get("text") ?? "");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [resultItems, setResultItems] = useState<ExtractedItem[] | null>(null);
  const [message, setMessage] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  const displayedMessage =
    message ?? (accountsError ? { kind: "error" as const, text: accountsError.message } : null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const newImages: PendingImage[] = [];
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith("image/")) continue;
      const base64Data = await fileToBase64(file);
      newImages.push({ file, base64Data, mimeType: file.type, previewUrl: URL.createObjectURL(file) });
    }
    setImages((prev) => [...prev, ...newImages]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!accountId) {
      setMessage({ kind: "error", text: "対象アカウントを選択してください" });
      return;
    }
    if (!sourceUrl.trim() && !rawText.trim() && images.length === 0) {
      setMessage({ kind: "error", text: "URL・テキスト・画像のいずれかを入力してください" });
      return;
    }
    setSubmitting(true);
    setResultItems(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          posted_date: postedDate,
          source_url: sourceUrl.trim() || null,
          raw_text: rawText.trim() || null,
          images: images.map((img) => ({ base64Data: img.base64Data, mimeType: img.mimeType })),
        }),
      });
      const data = await readJson<{ items: ExtractedItem[]; duplicate: boolean; message?: string }>(res);
      if (data.duplicate) {
        setMessage({ kind: "info", text: data.message ?? "同一の投稿が既に登録されています" });
      } else {
        setMessage({ kind: "info", text: `${data.items.length}件の価格情報を抽出しました` });
        setResultItems(data.items);
      }
      // 連続投入しやすいよう、アカウント・投稿日は維持したまま入力欄だけ空にする
      setSourceUrl("");
      setRawText("");
      setImages([]);
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "登録に失敗しました" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">投稿を登録</h1>
        <p className="mt-1 text-sm opacity-70">
          Xの投稿URL・テキスト・画像を貼り付けると、AIがBOX/パックの価格情報を自動抽出します。
          複数投稿分のテキストをまとめて貼っても、画像を複数枚まとめてアップロードしても構いません。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-black/10 p-4 dark:border-white/10">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">対象アカウント</span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
            >
              <option value="">選択してください</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.display_name}（{a.handle}）
                </option>
              ))}
            </select>
            {accounts.length === 0 && (
              <span className="mt-1 block text-xs opacity-60">
                アカウントが未登録です。先に「アカウント管理」から登録してください。
              </span>
            )}
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">投稿日</span>
            <input
              type="date"
              value={postedDate}
              onChange={(e) => setPostedDate(e.target.value)}
              className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">投稿URL（任意・重複チェックや引用元の記録に使用）</span>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://x.com/..."
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">テキスト（複数投稿分をまとめて貼り付け可）</span>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={6}
            placeholder="投稿本文をそのまま貼り付けてください"
            className="w-full rounded-md border border-black/15 bg-transparent px-3 py-2 font-mono text-xs dark:border-white/20"
          />
        </label>

        <div className="text-sm">
          <span className="mb-1 block font-medium">画像（複数枚まとめてアップロード可）</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="block w-full text-sm"
          />
          {images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.previewUrl} alt="" className="h-20 w-20 rounded-md object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -right-1 -top-1 rounded-full bg-black/70 px-1.5 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {submitting ? "解析中..." : "登録してAI解析する"}
        </button>
      </form>

      {displayedMessage && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            displayedMessage.kind === "error"
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {displayedMessage.text}
        </div>
      )}

      {resultItems && resultItems.length > 0 && (
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <h2 className="mb-3 text-sm font-semibold">抽出結果</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left opacity-60">
                <th className="pb-2">商品名</th>
                <th className="pb-2">種別</th>
                <th className="pb-2">価格</th>
                <th className="pb-2">確信度</th>
                <th className="pb-2">状態</th>
              </tr>
            </thead>
            <tbody>
              {resultItems.map((item) => (
                <tr key={item.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-2">{item.product_name_raw}</td>
                  <td className="py-2">{item.price_type === "buy" ? "買取" : "販売"}</td>
                  <td className="py-2">¥{item.price.toLocaleString()}</td>
                  <td className="py-2">{Math.round(item.confidence * 100)}%</td>
                  <td className="py-2">
                    {item.review_status === "confirmed" ? "確定" : item.review_status === "pending_review" ? "要確認" : "却下"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardForm />
    </Suspense>
  );
}
