'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

type PriceSummary = {
  min: number;
  max: number;
  avg: number;
  count: number;
  lastUpdated: string | null;
  isStale: boolean;
};

type PriceTrend = {
  month: string;
  avgPrice: number;
  count: number;
};

type Diagnosis = {
  id: string;
  brand_name: string | null;
  estimated_era: string | null;
  evidence_reason: string | null;
  overall_image_url: string;
  tag_image_url: string;
  buying_guide: string;
  created_at: string;
};

type Props = {
  diagnosis: Diagnosis;
  isPremium: boolean;
  priceSummary: PriceSummary;
  priceTrend: PriceTrend[];
};

// 仕入れシグナルの設定
const guideConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  buy: { label: 'BUY (仕入れ推奨)', bg: 'bg-emerald-950/30', text: 'text-emerald-400', border: 'border-emerald-800/40' },
  skip: { label: 'SKIP (見送り推奨)', bg: 'bg-red-950/30', text: 'text-red-400', border: 'border-red-800/40' },
  hold: { label: 'HOLD (様子見)', bg: 'bg-amber-950/30', text: 'text-amber-400', border: 'border-amber-800/40' },
};

export function DiagnosisView({ diagnosis, isPremium, priceSummary, priceTrend }: Props) {
  const router = useRouter();
  const currentGuide = guideConfig[diagnosis.buying_guide] || {
    label: '判定なし', bg: 'bg-neutral-800/30', text: 'text-neutral-400', border: 'border-neutral-700/40',
  };

  return (
    <div className="flex flex-col space-y-6 animate-fade-in">
      {/* 判定結果カード */}
      <div className="glass-panel p-6 flex flex-col items-center text-center space-y-4 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 gold-gradient-bg"></div>
        <span className="text-xs text-[#a39c93] tracking-widest uppercase">AI 鑑定書</span>
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-[#f5f2eb]">{diagnosis.brand_name || 'ブランド特定不能'}</h2>
          <p className="text-3xl font-extrabold gold-gradient-text">{diagnosis.estimated_era || '年代不明'}</p>
        </div>
        <div className={`w-full py-3.5 rounded-2xl border text-center font-bold text-sm tracking-wide ${currentGuide.bg} ${currentGuide.text} ${currentGuide.border}`}>
          {currentGuide.label}
        </div>
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-6 space-y-6 md:space-y-0">
        <div className="space-y-6">
          {/* 写真プレビュー */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-2 flex flex-col space-y-2">
              <span className="text-[10px] text-[#a39c93] text-center">全体</span>
              <div className="relative aspect-square rounded-lg overflow-hidden bg-black border border-neutral-800/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={diagnosis.overall_image_url} alt="Overall view" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="glass-panel p-2 flex flex-col space-y-2">
              <span className="text-[10px] text-[#a39c93] text-center">タグ・細部</span>
              <div className="relative aspect-square rounded-lg overflow-hidden bg-black border border-neutral-800/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={diagnosis.tag_image_url} alt="Tag view" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* 鑑定根拠 */}
          <div className="glass-panel p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[#f5f2eb] border-b border-[rgba(212,175,55,0.15)] pb-2 flex items-center">
              <span className="mr-1.5">📜</span> 鑑定・仕入れの根拠
            </h3>
            <p className="text-xs text-[#a39c93] leading-relaxed whitespace-pre-wrap">
              {diagnosis.evidence_reason || '根拠は提示されませんでした。'}
            </p>
          </div>
        </div>

        <div>
          {/* 価格相場トレンド（サーバーで計算済みのデータを受け取る） */}
          <div className="glass-panel p-5 space-y-4 h-full">
            <h3 className="text-sm font-semibold text-[#f5f2eb] border-b border-[rgba(212,175,55,0.15)] pb-2 flex items-center justify-between">
              <span className="flex items-center"><span className="mr-1.5">📈</span> 相場価格推移 (日本国内)</span>
              <span className="text-[10px] text-[#6e675f]">実売価格データベース連動</span>
            </h3>

            <div className="space-y-4">
              {priceSummary.isStale && (
                <div className="p-3 bg-amber-950/20 text-amber-500 border border-amber-800/30 rounded-lg text-[10px] leading-relaxed flex items-start space-x-2">
                  <span className="text-xs">⚠️</span>
                  <span>価格情報が最終更新から90日以上経過しています。現在のトレンドと乖離している可能性があります。</span>
                </div>
              )}

              {/* 相場サマリ */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#141211]/50 p-2.5 rounded-xl border border-neutral-800/40">
                  <span className="text-[10px] text-[#6e675f] block mb-1">最低相場</span>
                  <span className="text-sm font-bold text-[#f5f2eb]">
                    {priceSummary.min > 0 ? `¥${priceSummary.min.toLocaleString()}` : '¥-'}
                  </span>
                </div>
                <div className="bg-[#141211]/50 p-2.5 rounded-xl border border-[rgba(212,175,55,0.2)]">
                  <span className="text-[10px] text-[#d4af37] block mb-1">平均相場</span>
                  <span className="text-sm font-black text-[#d4af37]">
                    {priceSummary.avg > 0 ? `¥${priceSummary.avg.toLocaleString()}` : '¥-'}
                  </span>
                </div>
                <div className="bg-[#141211]/50 p-2.5 rounded-xl border border-neutral-800/40">
                  <span className="text-[10px] text-[#6e675f] block mb-1">最高相場</span>
                  <span className="text-sm font-bold text-[#f5f2eb]">
                    {priceSummary.max > 0 ? `¥${priceSummary.max.toLocaleString()}` : '¥-'}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-[#6e675f]">
                <span>サンプルデータ数: {priceSummary.count}件</span>
                {priceSummary.lastUpdated && (
                  <span>最終更新: {new Date(priceSummary.lastUpdated).toLocaleDateString('ja-JP')}</span>
                )}
              </div>

              {/* 詳細トレンドグラフ（プレミアム限定） */}
              {isPremium ? (
                <div className="space-y-3 pt-2">
                  <span className="text-xs text-[#f5f2eb] font-semibold block">月別平均相場推移</span>
                  {priceTrend.length > 0 ? (
                    <div className="bg-[#141211]/30 border border-neutral-800/50 p-4 rounded-xl space-y-3">
                      <div className="flex items-end justify-between h-24 pt-2">
                        {priceTrend.map((t, idx) => {
                          const maxVal = Math.max(...priceTrend.map(tr => tr.avgPrice));
                          const pct = maxVal > 0 ? (t.avgPrice / maxVal) * 100 : 0;
                          return (
                            <div key={idx} className="flex flex-col items-center flex-1 group">
                              <div className="w-full px-1 flex items-end justify-center h-20">
                                <div
                                  style={{ height: `${Math.max(10, pct)}%` }}
                                  className="w-4 rounded-t-sm gold-gradient-bg group-hover:opacity-80 transition-all duration-300 relative"
                                >
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-neutral-900 border border-[rgba(212,175,55,0.3)] text-[8px] text-[#d4af37] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                    ¥{t.avgPrice.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[8px] text-[#6e675f] mt-1.5">{t.month.slice(5)}月</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#6e675f] text-center py-4">推移データが不足しています。</p>
                  )}
                </div>
              ) : (
                <div className="border border-dashed border-[rgba(212,175,55,0.2)] bg-[#141211]/80 rounded-xl p-5 text-center space-y-3">
                  <span className="text-xl">🔒</span>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[#f5f2eb]">詳細な相場推移グラフはプレミアム限定です</h4>
                    <p className="text-[10px] text-[#a39c93] leading-relaxed">
                      ナレッジベースに古着の知見を1件投稿して承認されると、プレミアム機能が **7日間** 無料で解放されます！
                    </p>
                  </div>
                  <Link
                    href="/knowledge/submit"
                    className="inline-block py-2 px-4 rounded-lg bg-[rgba(212,175,55,0.1)] hover:bg-[rgba(212,175,55,0.2)] text-[#d4af37] border border-[rgba(212,175,55,0.3)] text-[10px] font-bold active:scale-95 transition-all"
                  >
                    知見を投稿する
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 次の鑑定ボタン */}
      <button
        onClick={() => router.push('/')}
        className="w-full py-3.5 rounded-xl border border-neutral-800 hover:border-[rgba(212,175,55,0.3)] text-xs font-semibold text-[#a39c93] hover:text-[#f5f2eb] transition-all bg-transparent active:scale-95"
      >
        次の鑑定を行う
      </button>
    </div>
  );
}
