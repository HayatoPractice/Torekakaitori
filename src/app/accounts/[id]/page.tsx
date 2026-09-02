"use client";

import Link from "next/link";
import { use } from "react";
import useSWR from "swr";
import { jsonFetcher } from "@/lib/api-client";
import type { Account } from "@/types/domain";

interface Aggregate {
  latest: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  count: number;
}
interface ProductSummary {
  product_id: string;
  product_name: string;
  sell: Aggregate;
  buy: Aggregate;
  spread: number | null;
}

/** スプレッドの絶対値がこの割合を超えたら急変として強調表示する */
const HIGHLIGHT_SPREAD_RATIO = 0.3;

function yen(v: number | null): string {
  return v === null ? "—" : `¥${v.toLocaleString()}`;
}

export default function AccountSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error } = useSWR<{ account: Account; products: ProductSummary[] }>(
    `/api/summary/accounts/${id}`,
    jsonFetcher
  );

  if (error) return <p className="text-sm text-red-500">{error.message}</p>;
  if (!data) return <p className="text-sm opacity-60">読み込み中...</p>;

  const { account, products } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{account.display_name}</h1>
        <p className="text-sm opacity-60">
          {account.handle}
          {account.url && (
            <a href={account.url} target="_blank" rel="noreferrer" className="ml-2 text-xs hover:underline">
              アカウントページを開く
            </a>
          )}
        </p>
      </div>

      {products.length === 0 ? (
        <p className="text-sm opacity-60">まだこのアカウントの価格データがありません。</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left opacity-60 dark:border-white/10">
                <th className="px-3 py-2">商品</th>
                <th className="px-3 py-2">販売（最新）</th>
                <th className="px-3 py-2">販売（最安〜最高）</th>
                <th className="px-3 py-2">買取（最新）</th>
                <th className="px-3 py-2">買取（最安〜最高）</th>
                <th className="px-3 py-2">スプレッド</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const spreadRatio =
                  p.spread !== null && p.sell.latest ? Math.abs(p.spread) / p.sell.latest : 0;
                const highlight = spreadRatio >= HIGHLIGHT_SPREAD_RATIO;
                return (
                  <tr key={p.product_id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                    <td className="px-3 py-2">
                      <Link href={`/products/${p.product_id}`} className="hover:underline">
                        {p.product_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{yen(p.sell.latest)}</td>
                    <td className="px-3 py-2 opacity-70">
                      {p.sell.count > 0 ? `${yen(p.sell.min)} 〜 ${yen(p.sell.max)}` : "—"}
                    </td>
                    <td className="px-3 py-2">{yen(p.buy.latest)}</td>
                    <td className="px-3 py-2 opacity-70">
                      {p.buy.count > 0 ? `${yen(p.buy.min)} 〜 ${yen(p.buy.max)}` : "—"}
                    </td>
                    <td
                      className={`px-3 py-2 font-medium ${
                        highlight ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : ""
                      }`}
                    >
                      {p.spread !== null ? `¥${p.spread.toLocaleString()}` : "—"}
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
