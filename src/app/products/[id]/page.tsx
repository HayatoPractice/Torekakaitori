"use client";

import { use, useMemo } from "react";
import useSWR from "swr";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { jsonFetcher } from "@/lib/api-client";
import { formatYen } from "@/lib/format";
import type { Product } from "@/types/domain";

interface TrendPoint {
  date: string;
  price: number;
  price_type: "sell" | "buy";
  account: string;
}
interface RankingRow {
  account: string;
  price_type: "sell" | "buy";
  price: number;
}

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = useSWR<{ product: Product; trend: TrendPoint[]; ranking: RankingRow[] }>(
    `/api/summary/products/${id}`,
    jsonFetcher
  );
  const product = data?.product ?? null;
  const trend = useMemo(() => data?.trend ?? [], [data]);
  const ranking = data?.ranking ?? [];

  const chartData = useMemo(() => {
    const byDate = new Map<string, { date: string; 販売?: number; 買取?: number; sellCount: number; buyCount: number }>();
    for (const p of trend) {
      if (!byDate.has(p.date)) byDate.set(p.date, { date: p.date, sellCount: 0, buyCount: 0 });
      const row = byDate.get(p.date)!;
      if (p.price_type === "sell") {
        row.販売 = ((row.販売 ?? 0) * row.sellCount + p.price) / (row.sellCount + 1);
        row.sellCount += 1;
      } else {
        row.買取 = ((row.買取 ?? 0) * row.buyCount + p.price) / (row.buyCount + 1);
        row.buyCount += 1;
      }
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [trend]);

  const sellRanking = ranking.filter((r) => r.price_type === "sell").sort((a, b) => a.price - b.price);
  const buyRanking = ranking.filter((r) => r.price_type === "buy").sort((a, b) => b.price - a.price);
  const latestDate = trend.length > 0 ? trend[trend.length - 1].date : null;

  if (error) return <p className="text-sm text-red-500">{error.message}</p>;
  if (!product) return <p className="text-sm opacity-60">読み込み中...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {product.has_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/products/${id}/image`}
              alt=""
              className="h-16 w-16 shrink-0 rounded-md object-cover"
            />
          )}
          <div>
            <h1 className="text-xl font-bold">{product.canonical_name}</h1>
            {product.resale_notes && (
              <p className="whitespace-pre-wrap text-xs opacity-60">再販: {product.resale_notes}</p>
            )}
          </div>
        </div>
        <a
          href={`/api/export/csv?product_id=${id}`}
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          この商品のCSVを出力
        </a>
      </div>

      {latestDate && (
        <p className="text-xs opacity-50">最新データ：{latestDate}（{daysAgo(latestDate)}日前）</p>
      )}

      {chartData.length > 0 ? (
        <div className="h-72 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => formatYen(v)} />
              <Tooltip formatter={(v) => formatYen(v)} />
              <Legend />
              <Line type="monotone" dataKey="販売" stroke="#2563eb" connectNulls dot={{ r: 3 }} />
              <Line type="monotone" dataKey="買取" stroke="#dc2626" connectNulls dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm opacity-60">価格推移データがまだありません。</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <h2 className="mb-2 text-sm font-semibold">販売が安い順</h2>
          {sellRanking.length === 0 ? (
            <p className="text-sm opacity-60">データなし</p>
          ) : (
            <ol className="space-y-1 text-sm">
              {sellRanking.map((r, i) => (
                <li key={`${r.account}-${i}`} className="flex justify-between gap-2">
                  <span className="min-w-0 break-words">
                    {i + 1}. {r.account}
                  </span>
                  <span className="shrink-0">{formatYen(r.price)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <h2 className="mb-2 text-sm font-semibold">買取が高い順</h2>
          {buyRanking.length === 0 ? (
            <p className="text-sm opacity-60">データなし</p>
          ) : (
            <ol className="space-y-1 text-sm">
              {buyRanking.map((r, i) => (
                <li key={`${r.account}-${i}`} className="flex justify-between gap-2">
                  <span className="min-w-0 break-words">
                    {i + 1}. {r.account}
                  </span>
                  <span className="shrink-0">{formatYen(r.price)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
