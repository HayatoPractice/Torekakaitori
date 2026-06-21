'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // 現在のユーザー情報を取得
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // プレミアム期間を取得
        const { data, error } = await supabase
          .from('users')
          .select('premium_until')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setPremiumUntil(data.premium_until);
        }
      }
    }
    getUser();
  }, [supabase]);

  // ログイン処理
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage({ type: 'error', text: error.message || 'ログインに失敗しました。' });
      setLoading(false);
      return;
    }

    if (data?.user) {
      router.push('/');
      router.refresh();
    }
  };

  // サインアップ（アカウント作成）処理
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage({ type: 'error', text: error.message || 'アカウント作成に失敗しました。' });
      setLoading(false);
      return;
    }

    setMessage({ type: 'success', text: '確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。' });
    setLoading(false);
  };

  // ログアウト処理
  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setPremiumUntil(null);
    setLoading(false);
    router.refresh();
  };

  // プレミアムの判定
  const isPremium = premiumUntil && new Date(premiumUntil) > new Date();
  const premiumDateStr = premiumUntil ? new Date(premiumUntil).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : null;

  return (
    <div className="flex flex-col space-y-6 animate-fade-in">
      {/* ヘッダーロゴ */}
      <div className="flex flex-col items-center space-y-2 py-4">
        <h1 className="text-3xl font-extrabold tracking-tight gold-gradient-text">VintVerify</h1>
        <p className="text-sm text-[#a39c93]">ヴィンテージ鑑定・仕入れ判定アシスタント</p>
      </div>

      {user ? (
        // ログイン済みの表示 (マイページ)
        <div className="glass-panel p-6 space-y-6 max-w-md mx-auto w-full">
          <h2 className="text-xl font-semibold border-b border-[rgba(212,175,55,0.15)] pb-3">アカウント情報</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#a39c93] block mb-1">メールアドレス</label>
              <p className="text-[#f5f2eb] font-medium">{user.email}</p>
            </div>

            <div>
              <label className="text-xs text-[#a39c93] block mb-1">会員ステータス</label>
              {isPremium ? (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[rgba(212,175,55,0.1)] text-[#d4af37] border border-[rgba(212,175,55,0.3)]">
                  プレミアム会員 (有効期限: {premiumDateStr})
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400">
                    無料プラン
                  </span>
                  <p className="text-xs text-[#a39c93]">
                    ※AI画像診断は月10回までです。ナレッジ投稿が採用されると、1件につき7日間のプレミアムプランが自動で解放されます。
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={loading}
            className="w-full py-3 rounded-xl border border-neutral-700 hover:border-red-500 hover:text-red-400 transition-all text-sm font-semibold active:scale-95 bg-transparent"
          >
            {loading ? '処理中...' : 'ログアウト'}
          </button>
        </div>
      ) : (
        // 未ログインの表示 (ログイン/新規登録フォーム)
        <div className="glass-panel p-6 space-y-6 max-w-md mx-auto w-full">
          <h2 className="text-xl font-semibold border-b border-[rgba(212,175,55,0.15)] pb-3">
            {isSignUp ? '新規アカウント登録' : 'ログイン'}
          </h2>

          {message && (
            <div className={`p-4 rounded-xl text-xs leading-relaxed ${
              message.type === 'success' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30' : 'bg-red-950/40 text-red-400 border border-red-800/30'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            <div>
              <label className="text-xs text-[#a39c93] block mb-1">メールアドレス</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@vintverify.com"
                className="w-full bg-[#141211] border border-[rgba(212,175,55,0.15)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-neutral-600 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-[#a39c93] block mb-1">パスワード</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#141211] border border-[rgba(212,175,55,0.15)] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-neutral-600 outline-none transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gold-gradient-bg text-neutral-950 font-bold hover:shadow-gold transition-all text-sm active:scale-95 cursor-pointer"
            >
              {loading ? '処理中...' : (isSignUp ? 'アカウントを作成する' : 'ログインする')}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-[#d4af37] hover:underline bg-transparent border-none cursor-pointer"
            >
              {isSignUp ? '既にアカウントをお持ちの方はこちら' : '新しくアカウントを作成する'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
