// Server Component: 診断データ・価格計算をサーバー側で完結させる
// → useEffect不要、/api/price-trend への fetch不要
import { notFound } from 'next/navigation';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { DiagnosisView } from '@/components/DiagnosisView';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DiagnosisDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // 1. 診断データを取得（ミドルウェアで認証済みのため、user取得は不要）
  const { data: diagnosis, error: diagError } = await supabase
    .from('diagnoses')
    .select('*')
    .eq('id', id)
    .single();

  if (diagError || !diagnosis) {
    notFound();
  }

  // 2. プレミアムステータスを取得
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userData } = await adminSupabase
    .from('users')
    .select('premium_until')
    .eq('id', user!.id)
    .single();
  const isPremium = userData ? new Date(userData.premium_until) > new Date() : false;

  // 3. 価格サマリは DB 側の集計関数（get_price_stats）で取得する
  //    → 全件をJSへ取得して集計するのを避け、インデックスを使った集計1回で済ませる
  const brandName = diagnosis.brand_name || '不明';
  const era = diagnosis.estimated_era || '不明';

  const { data: statsRows } = await supabase.rpc('get_price_stats', {
    p_brand: brandName,
    p_era: era,
  });
  const stats = statsRows?.[0];

  const priceSummary = stats && Number(stats.cnt) > 0 ? {
    min: Number(stats.min_price),
    max: Number(stats.max_price),
    avg: Number(stats.avg_price),
    count: Number(stats.cnt),
    lastUpdated: stats.last_updated as string,
    isStale: (() => {
      const last = new Date(stats.last_updated);
      const diffDays = Math.ceil(Math.abs(Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 90;
    })(),
  } : { min: 0, max: 0, avg: 0, count: 0, lastUpdated: null, isStale: false };

  // 4. プレミアム向け月別トレンドは、全レコードが必要なためプレミアム時のみ取得する
  //    （非プレミアムユーザーは上記の集計1回だけで完結し、全件取得は発生しない）
  let priceTrend: { month: string; avgPrice: number; count: number }[] = [];
  if (isPremium && priceSummary.count > 0) {
    const { data: priceLogs } = await supabase
      .from('price_log')
      .select('price, created_at')
      .eq('brand_name', brandName)
      .eq('era', era)
      .order('created_at', { ascending: true });

    if (priceLogs && priceLogs.length > 0) {
      const monthlyData: Record<string, { sum: number; count: number }> = {};
      priceLogs.forEach((log: { price: number; created_at: string }) => {
        const date = new Date(log.created_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[key]) monthlyData[key] = { sum: 0, count: 0 };
        monthlyData[key].sum += Number(log.price);
        monthlyData[key].count += 1;
      });
      priceTrend = Object.keys(monthlyData).sort().map(month => ({
        month,
        avgPrice: Math.round(monthlyData[month].sum / monthlyData[month].count),
        count: monthlyData[month].count,
      }));
    }
  }

  return (
    <DiagnosisView
      diagnosis={diagnosis}
      isPremium={isPremium}
      priceSummary={priceSummary}
      priceTrend={priceTrend}
    />
  );
}
