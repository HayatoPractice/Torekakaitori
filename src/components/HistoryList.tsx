'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

// 型定義
type Diagnosis = {
  id: string;
  brand_name: string | null;
  estimated_era: string | null;
  buying_guide: string;
  created_at: string;
  overall_image_url: string | null;
  tag_image_url: string | null;
};

type Props = { diagnoses: Diagnosis[] };

// 仕入れシグナルのバッジ配色
const guideBadges: Record<string, { label: string; style: string }> = {
  buy: { label: 'BUY', style: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' },
  skip: { label: 'SKIP', style: 'bg-red-950/40 text-red-400 border border-red-800/40' },
  hold: { label: 'HOLD', style: 'bg-amber-950/40 text-amber-400 border border-amber-800/40' },
};

// クライアント側は検索・フィルタリング・削除のUIを担当
export function HistoryList({ diagnoses: initialDiagnoses }: Props) {
  const router = useRouter();
  const [diagnoses, setDiagnoses] = useState(initialDiagnoses);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGuide, setFilterGuide] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // useMemo でフィルタリング（useEffect不要）
  const filteredHistory = useMemo(() => {
    return diagnoses.filter(item => {
      const matchesSearch = searchQuery.trim() === '' ||
        item.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.estimated_era?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGuide = filterGuide === 'all' || item.buying_guide === filterGuide;
      return matchesSearch && matchesGuide;
    });
  }, [diagnoses, searchQuery, filterGuide]);

  // 削除処理（DBのRLSポリシーで認証済みユーザー自身のデータのみ削除可能）
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Linkのナビゲーションを阻止
    e.stopPropagation();

    if (!confirm('この鑑定履歴を削除しますか？')) return;

    setDeletingId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('diagnoses').delete().eq('id', id);
      if (error) throw error;

      // 削除成功 → ローカルstateからも除去（Server Componentのリフレッシュ不要）
      setDiagnoses(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('削除に失敗しました。再度お試しください。');
    } finally {
      setDeletingId(null);
    }
  };

  if (diagnoses.length === 0) {
    return (
      <div className="glass-panel p-8 text-center space-y-5 my-6">
        <div className="text-4xl">📸</div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[#f5f2eb]">鑑定履歴がありません</h3>
          <p className="text-xs text-[#a39c93] max-w-xs mx-auto leading-relaxed">
            仕入れ判断をしたい古着の「全体写真」と「タグ写真」を撮影して、AI鑑定を実行してみましょう！
          </p>
        </div>
        <Link href="/" className="inline-block py-3 px-6 rounded-xl gold-gradient-bg text-neutral-950 text-xs font-bold hover:shadow-gold active:scale-95 transition-all">
          最初の鑑定をはじめる
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 検索・フィルタツールバー */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ブランド・年代で検索..."
          className="flex-1 bg-[#141211] border border-[rgba(212,175,55,0.15)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-3.5 py-2 text-[#f5f2eb] placeholder-neutral-600 outline-none text-xs transition-all"
        />
        <select
          value={filterGuide}
          onChange={(e) => setFilterGuide(e.target.value)}
          className="bg-[#141211] border border-[rgba(212,175,55,0.15)] focus:border-[#d4af37] rounded-xl px-2 py-2 text-[#f5f2eb] text-xs outline-none transition-all cursor-pointer"
        >
          <option value="all">すべて</option>
          <option value="buy">BUY</option>
          <option value="skip">SKIP</option>
          <option value="hold">HOLD</option>
        </select>
      </div>

      {/* 履歴リスト */}
      {filteredHistory.length === 0 ? (
        <p className="text-xs text-[#6e675f] text-center py-8">該当する履歴が見つかりませんでした。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredHistory.map((item) => {
            const badge = guideBadges[item.buying_guide] || { label: 'PENDING', style: 'bg-neutral-800 text-neutral-400' };
            const formattedDate = new Date(item.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
            const isDeleting = deletingId === item.id;
            return (
              <div key={item.id} className="relative group">
                <Link
                  href={`/diagnoses/${item.id}`}
                  className={`glass-panel p-3.5 flex items-center space-x-3.5 hover:bg-neutral-900/40 active:scale-[0.98] block transition-opacity ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-neutral-800/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.tag_image_url || item.overall_image_url || ''} alt="Thumbnail" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold text-[#f5f2eb] truncate mr-2">{item.brand_name || 'ブランド不明'}</h4>
                      <span className="text-[10px] text-[#6e675f] flex-shrink-0">{formattedDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#d4af37] font-semibold">{item.estimated_era || '年代不明'}</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${badge.style}`}>{badge.label}</span>
                    </div>
                  </div>
                </Link>

                {/* 削除ボタン（ホバー時に表示） */}
                <button
                  onClick={(e) => handleDelete(e, item.id)}
                  disabled={isDeleting}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-950/80 hover:bg-red-900 text-red-400 rounded-lg p-1.5 disabled:opacity-50"
                  title="削除"
                >
                  {isDeleting ? (
                    <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
