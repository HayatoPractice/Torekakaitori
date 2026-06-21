'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resizeImage } from '@/utils/imageResize';

export default function HomePage() {
  const router = useRouter();

  const [diagnosing, setDiagnosing] = useState(false);
  
  // 画像と状態管理
  const [overallImage, setOverallImage] = useState<string | null>(null);
  const [tagImage, setTagImage] = useState<string | null>(null);
  const [hintBrand, setHintBrand] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState('');

  // ファイルをBase64に変換するヘルパー
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'overall' | 'tag') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB制限（リサイズ前の元ファイルで判定）
    if (file.size > 5 * 1024 * 1024) {
      setError('画像ファイルは5MB以下にしてください。');
      e.target.value = '';
      return;
    }

    setError(null);
    try {
      // クライアント側でリサイズ・圧縮してからstateへ（転送量削減・APIエラー防止）
      const resized = await resizeImage(file);
      if (type === 'overall') {
        setOverallImage(resized);
      } else {
        setTagImage(resized);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像の読み込みに失敗しました。もう一度お試しください。');
    }
  };

  // 診断の送信
  const handleDiagnose = async () => {
    if (!overallImage || !tagImage) {
      setError('全体写真とタグ写真の両方を撮影・選択してください。');
      return;
    }

    setDiagnosing(true);
    setError(null);
    setProgressMsg('画像を最適化中...');

    try {
      setProgressMsg('AI鑑定士が分析中 (これには10〜15秒かかる場合があります)...');
      
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          overallImage,
          tagImage,
          hintBrand: hintBrand.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'usage_limit_exceeded') {
          setError(data.message);
        } else {
          setError(data.error || '鑑定中にエラーが発生しました。');
        }
        setDiagnosing(false);
        return;
      }

      setProgressMsg('結果を保存中...');
      router.push(`/diagnoses/${data.diagnoseId}`);

    } catch (err) {
      console.error(err);
      setError('ネットワークエラーが発生しました。接続を確認してもう一度実行してください。');
      setDiagnosing(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 animate-fade-in">
      {/* タイトル */}
      <div className="flex flex-col items-center py-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight gold-gradient-text mb-1">VintVerify</h1>
        <p className="text-xs text-[#a39c93]">仕入れ時に写真で真贋・年代・相場判定</p>
      </div>

      {diagnosing ? (
        // 診断中のローディング画面
        <div className="glass-panel p-8 flex flex-col items-center justify-center space-y-6 min-h-[350px]">
          <div className="relative w-24 h-24">
            {/* ヴィンテージ調のローダーサークル */}
            <div className="absolute inset-0 border-2 border-dashed border-[#d4af37] rounded-full animate-spin-slow"></div>
            <div className="absolute inset-2 border border-neutral-700 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔍</span>
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium text-[#f5f2eb]">鑑定中</h3>
            <p className="text-sm text-[#a39c93] max-w-xs leading-relaxed">{progressMsg}</p>
          </div>
        </div>
      ) : (
        // メインフォーム
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-950/40 text-red-400 border border-red-800/30 rounded-xl text-xs leading-relaxed">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 画像アップロードエリア (全体写真) */}
            <div className="glass-panel p-5 flex flex-col space-y-3">
              <h3 className="text-sm font-semibold text-[#f5f2eb] flex items-center">
                <span className="text-[#d4af37] mr-1.5">❶</span> 衣料の全体写真
              </h3>
              
              {overallImage ? (
                <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={overallImage} alt="Overall view preview" className="w-full h-full object-contain" />
                  <button
                    onClick={() => setOverallImage(null)}
                    className="absolute top-2.5 right-2.5 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/90 active:scale-90 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-video border border-dashed border-[rgba(212,175,55,0.2)] hover:border-[#d4af37] bg-[#141211] rounded-xl cursor-pointer transition-all hover:bg-neutral-900/40 p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[#a39c93] mb-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                  </svg>
                  <span className="text-xs text-[#f5f2eb] font-semibold mb-1">カメラを起動・全体写真を選択</span>
                  <span className="text-[10px] text-[#6e675f]">全体のディテールやステッチが写るように</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'overall')}
                  />
                </label>
              )}
            </div>

            {/* 画像アップロードエリア (タグ写真) */}
            <div className="glass-panel p-5 flex flex-col space-y-3">
              <h3 className="text-sm font-semibold text-[#f5f2eb] flex items-center">
                <span className="text-[#d4af37] mr-1.5">❷</span> ブランドタグ・品質表示タグ写真
              </h3>
              
              {tagImage ? (
                <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-neutral-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tagImage} alt="Tag view preview" className="w-full h-full object-contain" />
                  <button
                    onClick={() => setTagImage(null)}
                    className="absolute top-2.5 right-2.5 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/90 active:scale-90 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-video border border-dashed border-[rgba(212,175,55,0.2)] hover:border-[#d4af37] bg-[#141211] rounded-xl cursor-pointer transition-all hover:bg-neutral-900/40 p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[#a39c93] mb-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.248 10.499A1.79 1.79 0 0 1 4 8.75h16a1.79 1.79 0 0 1 1.752 1.749v7.5A1.79 1.79 0 0 1 20 19.75H4a1.79 1.79 0 0 1-1.752-1.751v-7.5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.25v4.5M8.25 6h7.5" />
                  </svg>
                  <span className="text-xs text-[#f5f2eb] font-semibold mb-1">カメラを起動・タグ写真を選択</span>
                  <span className="text-[10px] text-[#6e675f]">ロゴ、フォント、裏面表示が鮮明に写るように</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 'tag')}
                  />
                </label>
              )}
            </div>
          </div>

          {/* ヒント入力（任意） */}
          <div className="glass-panel p-5 flex flex-col space-y-3">
            <h3 className="text-sm font-semibold text-[#f5f2eb]">
              鑑定ヒント (任意)
            </h3>
            <input
              type="text"
              value={hintBrand}
              onChange={(e) => setHintBrand(e.target.value)}
              placeholder="例: Nike, 90年代, 銀タグ など"
              className="w-full bg-[#141211] border border-[rgba(212,175,55,0.15)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-neutral-600 outline-none transition-all text-sm"
            />
          </div>

          {/* 鑑定ボタン */}
          <button
            onClick={handleDiagnose}
            disabled={!overallImage || !tagImage}
            className={`w-full py-4 rounded-xl font-bold transition-all text-sm active:scale-95 cursor-pointer ${
              overallImage && tagImage
                ? 'gold-gradient-bg text-neutral-950 hover:shadow-gold'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50'
            }`}
          >
            AI鑑定を実行する
          </button>
        </div>
      )}
    </div>
  );
}
