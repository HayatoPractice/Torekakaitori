"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { jsonFetcher, readJson } from "@/lib/api-client";
import type { Account, ExtractedItem } from "@/types/domain";

interface ScrapedItem {
  text: string;
  url: string;
  postedDate: string | null; // Xから取得したISO日時。取れなければnull
  imageUrls: string[];
}

interface BatchPayload {
  source: string;
  items: ScrapedItem[];
}

interface ItemResult {
  ok: boolean;
  message: string;
}

function todayLocalDate(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/** ISO日時（UTC）をこの端末のローカル日付（YYYY-MM-DD）に変換する。壊れていれば今日を返す */
function toLocalDate(iso: string | null): string {
  if (!iso) return todayLocalDate();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayLocalDate();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/** 取り込み元URL（例: https://x.com/example_shop/status/123）からXハンドルらしき部分を拾う */
function guessHandle(source: string): string | null {
  try {
    const path = new URL(source).pathname.split("/").filter(Boolean);
    return path[0] ?? null;
  } catch {
    return null;
  }
}

function BulkReview() {
  const searchParams = useSearchParams();
  const batchId = searchParams.get("batch") ?? "";

  const { data: batchData, error: batchError } = useSWR<{ id: string; payload: BatchPayload }>(
    batchId ? `/api/scrape-import/${batchId}` : null,
    jsonFetcher
  );
  const { data: accountsData } = useSWR<{ accounts: Account[] }>("/api/accounts", jsonFetcher);
  const accounts = accountsData?.accounts ?? [];
  const items = useMemo(() => batchData?.payload.items ?? [], [batchData]);

  const [accountId, setAccountId] = useState("");
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [dates, setDates] = useState<Record<number, string>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<Record<number, ItemResult> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // データが届いたら、全件選択・日付の初期値・アカウントの自動推測を一度だけ行う。
  // SWRからの非同期データを起点に編集用ローカル状態を初期化する処理のため、
  // useEffect外では行えない（bookmarklet/page.tsxのsetCodeと同じ理由）
  useEffect(() => {
    if (!batchData) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: Record<number, boolean> = {};
      items.forEach((_, i) => (next[i] = true));
      return next;
    });
    setDates((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: Record<number, string> = {};
      items.forEach((item, i) => (next[i] = toLocalDate(item.postedDate)));
      return next;
    });
  }, [batchData, items]);

  useEffect(() => {
    if (accountId || accounts.length === 0 || !batchData) return;
    const handle = guessHandle(batchData.payload.source);
    if (!handle) return;
    const normalized = handle.replace(/^@/, "").toLowerCase();
    const matched = accounts.find((a) => a.handle.replace(/^@/, "").toLowerCase() === normalized);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (matched) setAccountId(matched.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, batchData]);

  function toggleAll(checked: boolean) {
    const next: Record<number, boolean> = {};
    items.forEach((_, i) => (next[i] = checked));
    setSelected(next);
  }

  async function handleImport() {
    setFormError(null);
    if (!accountId) {
      setFormError("対象アカウントを選択してください");
      return;
    }
    const targetIndexes = items.map((_, i) => i).filter((i) => selected[i]);
    if (targetIndexes.length === 0) {
      setFormError("取り込む投稿を1件以上選択してください");
      return;
    }

    setImporting(true);
    const nextResults: Record<number, ItemResult> = {};
    for (const i of targetIndexes) {
      setProgress(`${targetIndexes.indexOf(i) + 1}/${targetIndexes.length}件目を処理中...`);
      const item = items[i];
      try {
        const images: Array<{ base64Data: string; mimeType: string }> = [];
        for (const imageUrl of item.imageUrls) {
          const imgRes = await fetch(`/api/fetch-image?url=${encodeURIComponent(imageUrl)}`);
          images.push(await readJson<{ base64Data: string; mimeType: string }>(imgRes));
        }
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account_id: accountId,
            posted_date: dates[i] ?? todayLocalDate(),
            source_url: item.url || null,
            raw_text: item.text || null,
            images,
          }),
        });
        const data = await readJson<{ items: ExtractedItem[]; duplicate: boolean }>(res);
        nextResults[i] = data.duplicate
          ? { ok: true, message: "重複のためスキップ" }
          : { ok: true, message: `${data.items.length}件の価格情報を抽出` };
      } catch (err) {
        nextResults[i] = { ok: false, message: err instanceof Error ? err.message : "登録に失敗しました" };
      }
    }
    setResults(nextResults);
    setProgress("");
    setImporting(false);
    if (batchId) {
      fetch(`/api/scrape-import/${batchId}`, { method: "DELETE" }).catch(() => {});
    }
  }

  if (!batchId) return <p className="text-sm text-red-500">取り込みIDが指定されていません。ブックマークレットからやり直してください。</p>;
  if (batchError) return <p className="text-sm text-red-500">{batchError.message}</p>;
  if (!batchData) return <p className="text-sm opacity-60">読み込み中...</p>;

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">投稿を一括取り込み</h1>
        <p className="mt-1 text-sm opacity-70">
          ブックマークレットでXのページから読み取った{items.length}件の投稿です。取り込む投稿を選び、
          対象アカウントを指定して実行してください（価格の抽出は1件ずつAIが行うため、件数が多いと時間がかかります）。
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border border-black/10 p-4 sm:grid-cols-2 dark:border-white/10">
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
        </label>
        <div className="flex items-end gap-3 text-sm">
          <button type="button" onClick={() => toggleAll(true)} className="rounded-md border border-black/15 px-3 py-2 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
            すべて選択
          </button>
          <button type="button" onClick={() => toggleAll(false)} className="rounded-md border border-black/15 px-3 py-2 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
            すべて解除
          </button>
        </div>
      </div>

      {formError && <p className="text-sm text-red-500">{formError}</p>}
      {progress && <p className="text-sm opacity-70">{progress}</p>}

      <ul className="space-y-3">
        {items.map((item, i) => {
          const result = results?.[i];
          return (
            <li key={i} className="flex flex-wrap gap-3 rounded-lg border border-black/10 p-3 dark:border-white/10">
              <input
                type="checkbox"
                checked={selected[i] ?? false}
                disabled={importing || !!results}
                onChange={(e) => setSelected((prev) => ({ ...prev, [i]: e.target.checked }))}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs opacity-60">
                  <input
                    type="date"
                    value={dates[i] ?? todayLocalDate()}
                    disabled={importing || !!results}
                    onChange={(e) => setDates((prev) => ({ ...prev, [i]: e.target.value }))}
                    className="rounded border border-black/15 bg-transparent px-2 py-1 dark:border-white/20"
                  />
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline">
                      元投稿を開く
                    </a>
                  )}
                  {result && (
                    <span className={result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>
                      {result.ok ? "✓ " : "✕ "}
                      {result.message}
                    </span>
                  )}
                </div>
                {item.text && <p className="whitespace-pre-wrap break-words text-sm opacity-80">{item.text}</p>}
                {item.imageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.imageUrls.map((url, j) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={j} src={url} alt="" className="h-20 w-20 rounded-md object-cover" />
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {!results && (
        <button
          type="button"
          onClick={handleImport}
          disabled={importing || selectedCount === 0}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {importing ? "取り込み中..." : `選択した${selectedCount}件を取り込む`}
        </button>
      )}
      {results && <p className="text-sm opacity-70">取り込みが完了しました。この画面は閉じて構いません。</p>}
    </div>
  );
}

export default function BulkPostPage() {
  return (
    <Suspense fallback={null}>
      <BulkReview />
    </Suspense>
  );
}
