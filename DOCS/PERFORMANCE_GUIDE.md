# PERFORMANCE_GUIDE.md — アプリパフォーマンス実装ガイド

対象：隼（Hayato）
層：🔄 随時更新層
用途：アプリ実装時のパフォーマンス基準と最適化手順
更新時：新しい最適化パターンや目標値の変更時に更新する

---

## SECTION 1：品質ランク別パフォーマンス目標値

| 指標 | Bランク（個人/試作） | Aランク（商用標準） | Sランク（本格SaaS） |
|---|---|---|---|
| **LCP**（最大コンテンツ描画） | 4.0秒以内 | 2.5秒以内 | 1.5秒以内 |
| **CLS**（レイアウトシフト） | 0.25以内 | 0.1以内 | 0.05以内 |
| **FID / INP**（入力応答） | 300ms以内 | 200ms以内 | 100ms以内 |
| **Lighthouse スコア** | 70以上 | 85以上 | 95以上 |
| **API応答時間** | 1,000ms以内 | 500ms以内 | 200ms以内 |
| **初期バンドルサイズ** | 500KB以内 | 300KB以内 | 150KB以内 |

> 目標値は `PROJECT_STATE.md` の `performance_target` フィールドに記録し、社長が上書き可能。
> 未記載の場合はAランク（商用標準）を適用する。

---

## SECTION 2：Next.js 必須最適化

### 2-1. 画像最適化（next/image）

```tsx
// NG：通常の <img> タグを使う
<img src="/hero.jpg" alt="ヒーロー画像" />

// OK：next/image を使う（WebP自動変換・サイズ最適化）
import Image from 'next/image';

// Above the fold（画面内に最初から見える画像）
<Image
  src="/hero.jpg"
  alt="ヒーロー画像"
  width={1200}
  height={600}
  priority  // LCP改善のため必須
/>

// Below the fold（スクロールで見える画像）
<Image
  src="/feature.jpg"
  alt="機能紹介"
  width={600}
  height={400}
  // priority なし（遅延読み込み）
/>
```

**ルール：**
- 全ての画像に `width` と `height` を指定する（CLS防止）
- ファーストビューの画像には `priority` を付ける
- 外部URLの場合は `next.config.ts` の `images.remotePatterns` に追加する

---

### 2-2. フォント最適化（next/font）

```tsx
// NG：Google Fonts を直接 <link> で読み込む（レイアウトシフト発生）
// <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP" />

// OK：next/font を使う（セルフホスティング・CLS防止）
import { Noto_Sans_JP } from 'next/font/google';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',  // テキストのちらつき防止
});

export default function RootLayout({ children }) {
  return (
    <html className={notoSansJP.className}>
      <body>{children}</body>
    </html>
  );
}
```

---

### 2-3. コード分割（dynamic import）

重いライブラリは遅延読み込みする：

```tsx
import dynamic from 'next/dynamic';

// 地図コンポーネント（Leaflet等は重い）
const Map = dynamic(() => import('@/components/Map'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false,  // クライアントのみ
});

// グラフコンポーネント（Chart.js / Recharts）
const Chart = dynamic(() => import('@/components/Chart'), {
  loading: () => <Skeleton className="h-48 w-full" />,
});
```

**分割の目安：** ページの初期表示に不要なコンポーネント・ライブラリ（地図・グラフ・リッチテキストエディタ等）は全て `dynamic` で遅延読み込みする。

---

## SECTION 3：React Query パフォーマンス設定

### 3-1. 基本設定（QueryClient）

```tsx
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1分間はキャッシュを新鮮とみなす
      gcTime: 5 * 60 * 1000,       // 5分間メモリに保持
      retry: 1,                     // エラー時の再試行は1回のみ
      refetchOnWindowFocus: false,  // ウィンドウフォーカス時の自動再取得を無効
    },
  },
});
```

### 3-2. staleTime の用途別設定

| データ種別 | staleTime | 理由 |
|---|---|---|
| ユーザープロフィール | 5分 | 頻繁に変わらない |
| 商品一覧・マスターデータ | 10分 | 変更頻度が低い |
| 通知・メッセージ | 30秒 | リアルタイム性が必要 |
| リアルタイム株価・在庫 | 0（常に最新） | 古いデータが致命的 |

### 3-3. Prefetching（先読み）

```tsx
// ホバー時にデータを先読みする
<Link
  href={`/users/${userId}`}
  onMouseEnter={() =>
    queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: () => fetchUser(userId),
    })
  }
>
  ユーザー詳細
</Link>
```

---

## SECTION 4：バンドルサイズ管理

### 4-1. バンドル分析

```bash
# Next.js バンドルアナライザー
npm install --save-dev @next/bundle-analyzer

# next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
module.exports = withBundleAnalyzer({});

# 実行
ANALYZE=true npm run build
```

### 4-2. よくある重量ライブラリと対策

| ライブラリ | サイズ | 対策 |
|---|---|---|
| moment.js | ~300KB | `date-fns`（軽量）または `dayjs` に変更 |
| lodash（全体） | ~70KB | `lodash/throttle` 等の個別インポートに変更 |
| react-icons（全体） | 重い | `lucide-react` または個別インポートに変更 |
| xlsx | ~200KB | `dynamic` で遅延読み込み |

### 4-3. Tree-shaking のための named import

```tsx
// NG：ライブラリ全体をインポート
import _ from 'lodash';
import * as Icons from 'react-icons/fa';

// OK：必要な関数・コンポーネントのみをインポート
import throttle from 'lodash/throttle';
import { FaUser, FaHome } from 'react-icons/fa';
```

---

## SECTION 5：API パフォーマンス

### 5-1. N+1 問題の防止

```tsx
// NG：ループ内でAPIを呼ぶ
for (const userId of userIds) {
  const user = await fetch(`/api/users/${userId}`); // N回のAPI呼び出し
}

// OK：バッチAPIを使う
const users = await fetch('/api/users/batch', {
  method: 'POST',
  body: JSON.stringify({ ids: userIds }),
}); // 1回のAPI呼び出し
```

### 5-2. Supabase クエリ最適化

```tsx
// NG：関連データを別クエリで取得（N+1）
const posts = await supabase.from('posts').select('*');
for (const post of posts.data) {
  const author = await supabase.from('users').select('*').eq('id', post.user_id);
}

// OK：JOIN で一括取得
const posts = await supabase
  .from('posts')
  .select('*, author:users(id, name, avatar_url)');
```

### 5-3. API レート制限

```tsx
// next.js の API Route でレート制限を実装
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '60 s'), // 60秒で10回まで
});
```

---

## SECTION 6：計測・モニタリング

### 6-1. Lighthouse の自動計測

```yaml
# .github/workflows/lighthouse.yml（CI での自動計測）
- name: Run Lighthouse
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: |
      https://preview-url.vercel.app/
    budgetPath: ./lighthouse-budget.json
    uploadArtifacts: true
```

### 6-2. Core Web Vitals の実装計測

```tsx
// app/layout.tsx で Web Vitals を収集
export function reportWebVitals(metric: NextWebVitalsMetric) {
  console.log(metric); // 開発中はログ出力
  // 本番では Sentry / Google Analytics に送信
}
```

### 6-3. 実装完了時のチェックリスト

```
□ next/image を全ての画像に使用している
□ ファーストビューの画像に priority を付けている
□ next/font でフォントを読み込んでいる
□ 重いライブラリを dynamic() で遅延読み込みしている
□ React Query の staleTime を適切に設定している
□ バンドルアナライザーで異常に大きいモジュールがないか確認した
□ Lighthouse スコアがランク目標値を超えている
□ N+1 クエリが発生していないことを確認した
```

---

PERFORMANCE_GUIDE.md v1.0 — 🔄随時更新層。新最適化パターン発見時に追記すること。
