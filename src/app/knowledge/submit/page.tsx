'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { resizeImage } from '@/utils/imageResize';

// Zodでフォームのバリデーションルールを一元定義
const submitSchema = z.object({
  brandName: z.string().min(1, 'ブランド名を入力してください'),
  estimatedEra: z.string().min(1, '推定年代を入力してください'),
  features: z.string().min(10, '判別ポイントは10文字以上で入力してください'),
  salePrice: z.string().optional(),
});

type SubmitFormValues = z.infer<typeof submitSchema>;

export default function KnowledgeSubmitPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // React Hook Form で管理（個別useStateが不要になる）
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<SubmitFormValues>({
    mode: 'onChange',
  });

  // ファイルをBase64に変換
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 5MB制限（リサイズ前の元ファイルで判定）
    if (file.size > 5 * 1024 * 1024) {
      setImageError('画像ファイルは5MB以下にしてください。');
      e.target.value = '';
      return;
    }

    setImageError(null);
    try {
      // クライアント側でリサイズ・圧縮してからstateへ
      const resized = await resizeImage(file);
      setImage(resized);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : '画像の読み込みに失敗しました。');
    }
  };

  // 送信処理
  const onSubmit = async (values: SubmitFormValues) => {
    if (!image) {
      setImageError('証拠写真を添付してください。');
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: values.brandName,
          estimatedEra: values.estimatedEra,
          features: values.features,
          image,
          salePrice: values.salePrice ? Number(values.salePrice) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '投稿の送信に失敗しました。');

      setSubmitted(true);
      reset();
      setImage(null);
    } catch (err) {
      console.error(err);
      setServerError(err instanceof Error ? err.message : '通信エラーが発生しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 animate-fade-in">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#f5f2eb]">ナレッジ投稿</h1>
        <p className="text-xs text-[#a39c93]">古着・ヴィンテージの判別知見を共有する</p>
      </div>

      {submitted ? (
        // 完了表示
        <div className="glass-panel p-8 text-center space-y-5 my-6">
          <div className="text-5xl">🎉</div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#f5f2eb]">知見のご報告ありがとうございました！</h3>
            <p className="text-xs text-[#a39c93] leading-relaxed max-w-xs mx-auto">
              投稿は管理者の審査へ送られました。承認されると、プレミアム機能が **7日間** 解放されます。
            </p>
          </div>
          <div className="flex flex-col space-y-2 pt-2">
            <button
              onClick={() => setSubmitted(false)}
              className="py-3 px-6 rounded-xl gold-gradient-bg text-neutral-950 text-xs font-bold hover:shadow-gold active:scale-95 transition-all"
            >
              続けて知見を投稿する
            </button>
            <button
              onClick={() => router.push('/')}
              className="py-3 px-6 rounded-xl border border-neutral-800 text-xs font-semibold text-[#a39c93] hover:text-[#f5f2eb] active:scale-95 transition-all bg-transparent"
            >
              鑑定トップに戻る
            </button>
          </div>
        </div>
      ) : (
        // 入力フォーム
        <div className="space-y-6">
          {serverError && (
            <div className="p-4 bg-red-950/40 text-red-400 border border-red-800/30 rounded-xl text-xs">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="md:grid md:grid-cols-2 md:gap-8 md:space-y-0 space-y-5">
              {/* 左カラム：証拠写真 */}
              <div className="glass-panel p-5 space-y-3 h-fit">
                <label className="text-xs font-bold text-[#f5f2eb] block">
                  証拠写真・タグ画像 <span className="text-red-500">*</span>
                </label>

                {image ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-neutral-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="Submission preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setImage(null)}
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
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                    </svg>
                    <span className="text-xs text-[#f5f2eb] font-semibold mb-1">写真をアップロード</span>
                    <span className="text-[10px] text-[#6e675f]">タグやロゴ、年代判定の根拠となる部分の写真</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                )}
                {imageError && <p className="text-[10px] text-red-400 mt-1">{imageError}</p>}
              </div>

              {/* 右カラム：テキスト情報と判別ポイント */}
              <div className="space-y-5">
                {/* 基本テキスト情報 */}
                <div className="glass-panel p-5 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#f5f2eb] block mb-1">
                      ブランド名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('brandName')}
                      type="text"
                      placeholder="例: Nike, Levi's, Champion など"
                      className="w-full bg-[#141211] border border-[rgba(212,175,55,0.15)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-neutral-600 outline-none transition-all text-sm"
                    />
                    {errors.brandName && <p className="text-[10px] text-red-400 mt-1">{errors.brandName.message}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#f5f2eb] block mb-1">
                      推定年代 <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('estimatedEra')}
                      type="text"
                      placeholder="例: 70年代, 80年代後半, 90s など"
                      className="w-full bg-[#141211] border border-[rgba(212,175,55,0.15)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-neutral-600 outline-none transition-all text-sm"
                    />
                    {errors.estimatedEra && <p className="text-[10px] text-red-400 mt-1">{errors.estimatedEra.message}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#f5f2eb] block mb-1">
                      実売価格（日本円・任意）
                    </label>
                    <input
                      {...register('salePrice')}
                      type="number"
                      placeholder="例: 8800 (半角数値)"
                      className="w-full bg-[#141211] border border-[rgba(212,175,55,0.15)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-neutral-600 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {/* 判別ポイント */}
                <div className="glass-panel p-5 space-y-2">
                  <label className="text-xs font-bold text-[#f5f2eb] block">
                    判別ポイント・解説 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('features')}
                    rows={5}
                    placeholder="例: タグの刺繍ロゴにレジスターマーク(R)がない。縫製はシングルステッチ。タグ裏に『MADE IN USA』の表記があるため、80年代中頃のUSA製と判定。"
                    className="w-full bg-[#141211] border border-[rgba(212,175,55,0.15)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-neutral-600 outline-none transition-all text-sm resize-none leading-relaxed"
                  />
                  {errors.features && <p className="text-[10px] text-red-400 mt-1">{errors.features.message}</p>}
                </div>
              </div>
            </div>

            {/* 投稿送信ボタン */}
            <button
              type="submit"
              disabled={submitting || !isValid || !image}
              className={`w-full py-4 rounded-xl font-bold transition-all text-sm active:scale-95 cursor-pointer ${
                !submitting && isValid && image
                  ? 'gold-gradient-bg text-neutral-950 hover:shadow-gold'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50'
              }`}
            >
              {submitting ? '投稿を送信中...' : '知見を報告する'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
