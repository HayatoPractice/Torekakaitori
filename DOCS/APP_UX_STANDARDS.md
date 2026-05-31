# APP_UX_STANDARDS.md — アプリUX実装標準

対象：隼（Hayato）
層：🔄 随時更新層
用途：アプリ実装時のUX品質基準。ローディング・エラー・空状態などの「状態表現」を標準化する
更新時：新しいパターンや基準変更時に更新する

> **品質ランクについて：** 新規アプリ作成時に社長が選択する。未指定の場合はAランク（商用標準）を適用。

---

## SECTION 1：品質ランク定義（Sランク / Aランク / Bランク）

| ランク | 対象 | 基準 |
|---|---|---|
| **Sランク** | 外部公開の本格SaaS・多数のユーザーが使う商用アプリ | Aランク全項目 + スケルトンUI必須・楽観的更新・リアルタイムエラー監視（Sentry） |
| **Aランク（デフォルト）** | 外部公開の商用アプリ・フリーミアムサービス | 本ドキュメントの全標準を適用 |
| **Bランク** | 個人ツール・試作品・社内限定ツール | ローディング表示必須・エラー表示必須・スタイルは任意 |

---

## SECTION 2：ローディング状態の標準

### 2-1. 使い分け基準

| 状況 | 推奨コンポーネント | 禁止 |
|---|---|---|
| リスト・カード一覧の初期読み込み | スケルトンUI（Skeleton） | スピナーのみ（何が来るか不明） |
| ボタン押下後の処理中 | ボタン内スピナー + ボタンを disabled | ページ全体のオーバーレイ（操作が完全に止まる） |
| ページ遷移 | Next.js の loading.tsx / React Suspense | 何も表示しない（白画面） |
| データの背景更新（refetch） | 何も表示しない or 小さな更新インジケーター | 画面全体のローディング |

### 2-2. スケルトンUIの実装基準（Aランク以上）

```tsx
// shadcn/ui の Skeleton コンポーネントを使う
import { Skeleton } from '@/components/ui/skeleton';

// 実際のコンテンツと同じ形・サイズで作る
function UserCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}
```

### 2-3. ボタンローディングの実装基準

```tsx
// isPending / isLoading をボタンに伝える
<Button disabled={isPending}>
  {isPending ? (
    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />保存中...</>
  ) : '保存する'}
</Button>
```

---

## SECTION 3：エラー状態の標準

### 3-1. エラーの分類と表示方法

| エラー種別 | 原因 | 表示方法 |
|---|---|---|
| バリデーションエラー | ユーザーの入力ミス | フォームフィールドの下にインラインで表示（赤文字） |
| 認証エラー | セッション切れ・未ログイン | トーストで通知 → ログインページへリダイレクト |
| ネットワークエラー | 通信障害・サーバーエラー | トーストで「再試行」ボタン付きエラーを表示 |
| 権限エラー | アクセス権なし | 専用の 403 エラーページに遷移 |
| 予期せぬエラー | バグ・サーバー内部エラー | エラーバウンダリで「問題が発生しました」を表示 |

### 3-2. トースト通知の基準

```tsx
// shadcn/ui の toast または sonner を使う
import { toast } from 'sonner';

// 成功
toast.success('保存しました');

// エラー（再試行可能）
toast.error('保存に失敗しました', {
  action: { label: '再試行', onClick: () => handleSave() },
});

// エラー（操作が必要）
toast.error('セッションが切れました。再ログインしてください');
```

### 3-3. エラーバウンダリの実装（Aランク以上）

```tsx
// app/error.tsx (Next.js App Router)
'use client';
export default function Error({
  error, reset,
}: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2 className="text-lg font-semibold">問題が発生しました</h2>
      <p className="text-sm text-muted-foreground">
        しばらく時間をおいて再試行してください
      </p>
      <Button onClick={reset}>再試行</Button>
    </div>
  );
}
```

---

## SECTION 4：空状態（Empty State）の標準

### 4-1. 実装基準

空状態とは「データが0件の場合」。何も表示しないことは禁止。

| 場面 | 必須要素 |
|---|---|
| 検索結果が0件 | 「○○ は見つかりませんでした」+ 検索条件のリセットボタン |
| リスト初回（データなし） | 説明テキスト + アクションボタン（「最初の○○を作成する」） |
| 通知・メッセージが0件 | 「通知はありません」等の説明テキスト（ボタンは任意） |

### 4-2. 実装例

```tsx
function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <InboxIcon className="h-12 w-12 text-muted-foreground" />
      <p className="text-muted-foreground">{message}</p>
      {actionLabel && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
```

---

## SECTION 5：フォームUXの標準

### 5-1. バリデーションのタイミング

| タイミング | 実装 | 用途 |
|---|---|---|
| Submit 時 | `handleSubmit` でまとめて検証 | 全フォーム |
| フィールドからフォーカスが外れた時（onBlur） | `trigger(fieldName)` | メールアドレス・パスワード |
| リアルタイム（onChange） | `watch` + 即時 `trigger` | パスワード強度・文字数カウンター |

### 5-2. React Hook Form + Zod の標準構成

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上にしてください'),
});

type FormData = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

### 5-3. 送信中の二重送信防止

```tsx
// formState.isSubmitting を使って送信中はボタンを無効化
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? '送信中...' : '送信する'}
</Button>
```

---

## SECTION 6：マイクロインタラクション基準

### 6-1. ホバー・フォーカスの標準

```css
/* 全てのインタラクティブ要素に transition を付ける */
.button {
  transition: all 150ms ease-in-out;
}
/* 色変化のみのホバーは禁止（AP-E1と同様）。transform を必ず組み合わせる */
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
```

### 6-2. フォーカスリング（アクセシビリティ）

```css
/* フォーカスリングを消してはいけない。デザインで整える */
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

---

## SECTION 7：ナビゲーションUXの標準

| 状況 | 実装 |
|---|---|
| 現在のページをナビに示す | `pathname` で active クラスを付ける |
| ページ遷移後のスクロール位置 | トップにリセット（Next.js はデフォルトでリセット） |
| 確認なし破壊的操作 | 削除・キャンセルは必ず確認ダイアログを挟む |
| 長いフォームの途中離脱 | `beforeunload` で「変更が失われます」を警告 |

---

APP_UX_STANDARDS.md v1.0 — 🔄随時更新層。新パターン発見時に追記すること。
