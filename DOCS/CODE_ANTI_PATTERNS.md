# CODE_ANTI_PATTERNS.md — コードアンチパターン集（アプリ開発特化版）

対象：隼（Hayato）
層：🔄 随時更新層（新パターン発見時に追記）
用途：AIがコードを書く前・レビューする前に参照し、思考停止コーディングを防ぐ
更新時：新しいアンチパターンを発見したら即追記する

> ⚠️ **最重要前提：ユーザーが明示的に指定した実装方法はこのファイルのルールより常に優先される。**
> このファイルは「理由なく行う悪習慣」を禁止するものであり、意図ある設計判断を妨げない。

> 📌 **汎用エッセンス（全プロジェクト共通の価値ある知見）**
> - コードを書く前に対象カテゴリのアンチパターンをセルフチェックする習慣が品質を上げる
> - ユーザーが明示的に指定した実装方法はアンチパターンルールより常に優先される
> - 「動けばいい」から「壊れにくい・読みやすい」への意識転換がプロ品質の鍵
> （全体の汎用知見は DOCS/ESSENCE_INDEX.md に集約）

---

## このファイルの使い方

AIはコードを書く前に対象カテゴリのアンチパターンを確認し、
該当するパターンを意図せず書こうとしていないかセルフチェックする。

---

## カテゴリ A：React / Next.js フック乱用

### AP-A1：useEffect での非同期データ取得

**問題のあるコード：**
```tsx
// NG：useEffect + fetch の直書き
useEffect(() => {
  fetch('/api/users')
    .then(res => res.json())
    .then(data => setUsers(data));
}, []);
```

**なぜ問題か：**
- ローディング・エラー状態の管理が手動で煩雑
- コンポーネントアンマウント時のクリーンアップが漏れやすい
- キャッシュ・再フェッチ・楽観的更新などが全て手実装になる

**正しい実装：**
```tsx
// OK：React Query / SWR を使う
const { data: users, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: () => fetch('/api/users').then(res => res.json()),
});
```

---

### AP-A2：useEffect の依存配列省略・誤設定

**問題のあるコード：**
```tsx
// NG：依存配列が空なのに内部で props を参照している
useEffect(() => {
  doSomethingWith(userId); // userId が変わっても再実行されない
}, []);

// NG：eslint-disable で警告を黙らせる
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => { ... }, []);
```

**なぜ問題か：** stale closure による予期せぬバグの温床。`eslint-disable` は根本解決にならない。

**正しい実装：** 依存配列を正確に記述する。`useCallback` / `useMemo` で関数・オブジェクトを安定させる。

---

### AP-A3：useState の過剰使用（導出値をstateに入れる）

**問題のあるコード：**
```tsx
// NG：計算できる値をstateに持つ
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);
```

**正しい実装：**
```tsx
// OK：レンダリング時に計算する（stateにしない）
const fullName = `${firstName} ${lastName}`;
```

---

## カテゴリ B：型安全の放棄

### AP-B1：any 型の乱用

**問題のあるコード：**
```tsx
// NG：全てを any で逃げる
const handleData = (data: any) => {
  console.log(data.user.name); // 実行時エラーリスク
};
```

**正しい実装：**
```tsx
// OK：型を定義する
type UserData = { user: { name: string } };
const handleData = (data: UserData) => {
  console.log(data.user.name);
};
```

---

### AP-B2：as による型断言の乱用

**問題のあるコード：**
```tsx
// NG：型チェックを無理やり通す
const user = response as User;
const element = document.getElementById('root') as HTMLDivElement;
```

**なぜ問題か：** `as` は TypeScript の型チェックをバイパスする。実行時エラーを引き起こす。

**正しい実装：** 型ガード / `instanceof` / ランタイムバリデーション（Zod等）を使う。

---

### AP-B3：型定義の手抜き（再利用できない型を何度も書く）

**問題のあるコード：**
```tsx
// NG：同じ構造を別の場所で別々に定義
function getUser(): { id: string; name: string } { ... }
function updateUser(user: { id: string; name: string }) { ... }
```

**正しい実装：** `types/` または `lib/types.ts` に共通型を定義して再利用する。

---

## カテゴリ C：エラーハンドリングの省略

### AP-C1：エラーを握りつぶす

**問題のあるコード：**
```tsx
// NG：エラーを無視
try {
  await saveData();
} catch (e) {
  // 何もしない
}

// NG：console.log だけして終わり
catch (e) {
  console.log(e);
}
```

**正しい実装：**
```tsx
// OK：ユーザーへの通知 + ログ記録
catch (error) {
  logger.error('saveData failed', { error, context });
  toast.error('保存に失敗しました。再試行してください。');
}
```

---

### AP-C2：非同期関数の戻り値を await しない

**問題のあるコード：**
```tsx
// NG：Promise を無視（エラーが捕捉されない）
async function handleClick() {
  saveData(); // await していない
  router.push('/next');
}
```

**正しい実装：** 全ての async 呼び出しに `await` を付ける、または `void` を明示する。

---

### AP-C3：API レスポンスの検証なし

**問題のあるコード：**
```tsx
// NG：APIレスポンスをそのまま信用して使う
const data = await fetch('/api/user').then(r => r.json());
setUser(data.user); // data.user が undefined でも気づかない
```

**正しい実装：** Zod 等のスキーマバリデーションで API レスポンスを検証してから使う。

---

## カテゴリ D：コード品質の劣化

### AP-D1：console.log の本番残置

**問題のあるコード：**
```tsx
console.log('DEBUG:', user); // 本番環境でも出力される
console.log('ここに来た');
```

**ルール：** `console.log` はデバッグ専用。本番リリース前に必ず全削除する。
代替：`logger.debug()` 等の環境別出力制御があるユーティリティを使う。

---

### AP-D2：マジックナンバー・マジック文字列

**問題のあるコード：**
```tsx
// NG：数値・文字列の意味が不明
if (status === 2) { ... }
if (role === 'admin_super') { ... }
setTimeout(callback, 86400000);
```

**正しい実装：**
```tsx
// OK：定数として定義
const UserStatus = { ACTIVE: 1, SUSPENDED: 2, DELETED: 3 } as const;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
if (status === UserStatus.SUSPENDED) { ... }
```

---

### AP-D3：コンポーネントの肥大化

**問題のある状態：** 1つのコンポーネントが300行を超えている。

**ルール：** 以下のいずれかに当てはまれば分割する：
- ロジックが独立して再利用できる → カスタムフックへ
- UIの塊が独立している → 子コンポーネントへ
- 状態管理が複雑 → Context / Zustand / Jotai へ

---

### AP-D4：Props drilling（深いバケツリレー）

**問題のある状態：** `userId` を App → Page → Layout → Section → Card → Button と5階層渡している。

**ルール：** 3階層以上バケツリレーが発生したら Context か状態管理ライブラリを検討する。

---

## カテゴリ E：思考停止デフォルト

### AP-E1：理由なくデフォルト値を使う

**問題のあるコード：**
```tsx
// NG：なんとなく blue-500 にする
<Button className="bg-blue-500">送信</Button>

// NG：なんとなく Inter フォントにする（プロジェクト設計なし）
font-family: 'Inter', sans-serif;
```

**ルール：** 色・フォント・サイズは「なぜその値か」を言語化できるものだけ使う。
ユーザーが明示的に指定した場合はその指示が最優先。

---

### AP-E2：設計を考えずにとりあえず useState

**問題のあるコード：**
```tsx
// NG：URLに入れれば済む状態をstateで管理
const [page, setPage] = useState(1);
const [filter, setFilter] = useState('all');
// → URLシェアができない・ブラウザバックで状態が消える
```

**判断基準：**
- URLで共有されるべき状態 → `useSearchParams`（Next.js）/ `useQueryState`
- セッション中だけ使う状態 → `useState`
- 複数コンポーネントで使う状態 → `Context` / `Zustand`
- サーバーから取得するデータ → `React Query` / `SWR`

---

### AP-E3：全データを一括フェッチ

**問題のあるコード：**
```tsx
// NG：最初に全件取得（10万件でも）
const users = await db.user.findMany();
```

**ルール：** 常にページネーション・フィルタリングを前提に設計する。初期実装でも `limit: 50` 以上は設定しない。

---

## カテゴリ F：セキュリティ系

### AP-F1：環境変数の直接埋め込み

**問題のあるコード：**
```tsx
// NG：コード中に直接書く
const apiKey = 'sk-1234567890abcdef';
const supabaseUrl = 'https://xxx.supabase.co';
```

**ルール：** 全てのシークレットは `.env.local` に書き、`process.env.KEY_NAME` で参照する。GASは PropertiesService を使う。

---

### AP-F2：フロントエンドのみの認可チェック

**問題のあるコード：**
```tsx
// NG：UI上は隠しているが、APIは誰でも叩ける
{isAdmin && <DeleteButton />}  // ボタンは隠れているがAPIは叩ける
```

**ルール：** 認可チェックは必ずバックエンド（API Route / RLS）でも実施する。フロントの非表示はUX目的のみ。

---

CODE_ANTI_PATTERNS.md v1.0 — 🔄随時更新層。新パターン発見時に追記すること。
