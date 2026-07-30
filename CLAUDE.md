# CLAUDE.md — AIエージェント開発・自動化マスター（APP版）

<context>
このファイルはプロジェクトの「脳」であり、Claude Code・VSCode・Cursorが起動時に自動で読み込む最優先の指示書である。最新のプロンプト工学と自律開発サイクルの知見が統合されている。
</context>

---

## 起動シーケンス（必須・スキップ禁止）

<startup_sequence>
<!--
  ★ 2層構造読込方式（旧：全ファイル一括 → 新：INDEX先読み＋必要時ピンポイント）
  旧方式：全DOCSを起動時に読込 → 約30,000トークン消費
  新方式：まずINDEXだけ読み → 作業に応じて必要なファイルだけ読む → 約1/10以下

  💡 自動化ショートカット：`/project:start` を実行すると以下の起動手順が自動化される
     （MINUTES.md 読込・TODO確認・HP原本差分確認・起動報告提示まで一括実行）
-->

【STEP 1】必ず読む（2ファイル固定・毎回必須）
  ① `AGENTS.md`（ルート）       — AI行動規範・トークン削減規範
  ② `DOCS/DOCS_INDEX.md`       — 全ファイル索引・タスク別読込先（約500トークン）

【STEP 2】必要に応じて読む（遅延ロード・DOCS_INDEX.md の早見表で判断）
  - セッション開始・作業再開時 → `MINUTES.md`（前回の続き・次のタスク確認）
  - 実装・設計作業時          → DOCS_INDEX.md「タスク別：読むべきファイル早見表」で対象ファイルを特定してピンポイントで読む
  - ⚠️ APP_SHARED_RULES.md・SERVICE_ORG_CORE.md 等の大型ファイルは全読み禁止。必要セクションのみ読む

【STEP 3】インシデント管理の参照（起動時・機能追加・編集・削除時に推奨）
  ※ インシデントは「必ず守るべき絶対ルール」ではなく「過去に起きた問題への注意喚起」です。
    「以前このような問題があったので気をつけてほしい」という参考情報として活用してください。
    現在の作業に活かすかどうかは状況に応じて判断してください。

  Step 1｜`/Users/sasakihayato/アプリ作成関連/アプリ作成/インシデント管理/_PRE_CHECKLIST.md` を参照し、過去の注意事項を把握する
  Step 2｜`/Users/sasakihayato/アプリ作成関連/アプリ作成/インシデント管理/INCIDENT_INDEX.md` の「技術スタック別クイック検索」で作業タグを照合する
  Step 3｜関連するインシデントファイルだけを読む（全ファイル読込は禁止）
  Step 4｜類似事例が見つかった場合は「⚠️ 参考：過去に類似の問題がありました [INC-XXX]」として共有する
  ※ 新機能追加・既存機能編集・機能削除のたびに Step 2〜3 を繰り返すことを推奨する

【STEP 4】読み込み完了後に実行
  - `<thinking>`：読み込んだ情報を分析し、現在のプロジェクト状態・教訓・次の一手を論理的に推論せよ。
  - 環境チェック：`git status` でローカルの状態を確認し、必要に応じてMCPやweb_fetchで情報補完せよ。
  - TODO確認：`TODO/` フォルダのファイルが存在する場合、§23-5 の手順で未完了タスク一覧と進捗サマリーを表示する。

【STEP 5】ホームページ作成原本との差分確認（§30 相互監視ルール）
  - `python3 scripts/compare_origins.py` を実行し、HP側の新着コミットを確認する
  - アプリ作成原本に活用できる変更があれば提案する（HP側フォルダは絶対に編集しない）
  - スクリプトが存在しない場合はスキップしてよい
</startup_sequence>

---

## 基本行動原則（Core Directives）

→ `DOCS/APP_SHARED_RULES.md` §12 を参照すること（一元管理のため）

---

## プロジェクト管理 & 学習

→ `DOCS/APP_SHARED_RULES.md` §13 を参照すること（一元管理のため）

---

## 起動報告フォーマット

→ `DOCS/README.md`「セッション再開報告」のフォーマットを使用すること（一元管理のため）

---

## 型安全スタック標準

→ `DOCS/MASTER_LESSONS.md`「スタック標準」セクションを参照すること（一元管理のため）

---

## AI共通行動指針
`DOCS/APP_SHARED_RULES.md` は全アプリ共通ルールの正本。
セッション開始時に全読みは禁止（約25,000トークン消費のため）。
`DOCS/DOCS_INDEX.md` の早見表で必要なセクションだけをピンポイントで参照すること。
（原本で一元管理 → 各プロジェクトへ配布。変更は原本側で行う）

---

## セッション終了プロトコル

「終わります」「今日はここまで」「ありがとう」「お疲れ様」などの発言があった場合、
AI は自動で以下の終了手順を提案・実行すること：

```
Step 1: MINUTES.md の TL;DR を最終状態に更新する
        （現在地・前回完了・次のタスク・注意事項を最新状態にする）

Step 2: TODO手順書の未完了タスクを §23-6 の手順で抽出し、MINUTES.md の「次のタスク」欄へ転記する

Step 3: 変更ファイルを MINUTES.md に記録する
        git diff --name-only HEAD を実行して変更ファイル一覧を取得する

Step 4: PROJECT_STATE.md を現在の状態に更新する（フェーズ・進捗）

Step 5: 未コミットの変更があれば git commit & push する

Step 6: 次回タスクをユーザーへ報告する：
  ┌────────────────────────────────────────┐
  │ 【セッション終了】                      │
  │ 完了：[このセッションで終わったこと]    │
  │ 次回：[次のタスク名（MINUTES.md より）] │
  │ 未完了TODO：N件（TODO/<ファイル名>.md） │
  │ 保存：MINUTES.md・PROJECT_STATE.md 更新済 │
  └────────────────────────────────────────┘
```

> Gemini CLI を使用している場合は終了時に `/chat save last` を実行してセッションを保存すること。

---

## コードベース概要（VintVerify：古着ブランド・年代鑑定アプリ）

> このセクションのみ本リポジトリのコード内容に固有（上記は全アプリ共通の起動テンプレート）。
> 新規プロジェクトへ配布する際は、このセクションを配布先アプリの内容に書き換えること。

### 開発コマンド

- `npm run build` の型チェックのみ内包（単体の型チェックコマンドはない）。テストフレームワークは未導入（テストコマンドなし）。
- Supabase のスキーマ変更は `supabase/schema.sql` を Supabase ダッシュボードの SQL Editor で直接適用する（マイグレーションツール未導入）。`get_price_stats` 関数の適用漏れに注意（本番未適用の場合は価格集計機能が動かない）。

### アーキテクチャ

**スタック**: Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS v4 + Supabase (Auth/DB/Storage) + Anthropic Claude（Vercel AI SDK 経由）。パスエイリアス `@/*` → `src/*`。

**モックモード（環境変数未設定時のフォールバック）**
`NEXT_PUBLIC_SUPABASE_URL` が未設定 or `placeholder` を含む場合、`src/utils/supabase/{client,server}.ts` は本物の Supabase クライアントの代わりに `src/utils/supabase/mockClient.ts`（localStorage ベースの疑似 DB・Auth・Storage・RPC）を返す。これによりクラウド環境なしでもアプリ全体が動作する。**mockClient.ts は削除禁止**（開発・デモ用のフォールバックとして現役使用中）。同様に `ANTHROPIC_API_KEY` 未設定時は `src/app/api/diagnose/route.ts` 内でモック鑑定結果（Nike/Levi's/Adidas の固定データ）を返す isMockMode 分岐がある。本番相当の挙動を確認する際は両方の環境変数が実際に設定されているか確認すること。

**認証フロー**
`src/middleware.ts` が `PROTECTED_ROUTES`（`/`, `/history`, `/knowledge/submit`, `/diagnoses`）への未認証アクセスをエッジで `/auth` にリダイレクトする。`src/utils/supabase/middleware.ts` の `updateSession` でセッション更新後、`createServerClient` で `auth.getUser()` を確認する2段構成。

**Supabase クライアントの使い分け**（`src/utils/supabase/`）
- `client.ts` — ブラウザ用（Client Component から使用）
- `server.ts` の `createClient()` — Cookie 連携のサーバー用（Route Handler / Server Component）。RLS が効く
- `server.ts` の `createAdminClient()` — Service Role キー使用、RLSをバイパスする管理者クライアント。無料枠カウントなど RLS 越えが必要な処理限定で使用（Route Handler 内のみ、クライアントに露出させない）

**DB スキーマ**（`supabase/schema.sql`）
`users`（`auth.users` と1:1、`premium_until` で課金状態管理）/ `diagnoses`（鑑定履歴）/ `brands`（ブランド・年代特徴マスタ、読取専用）/ `submissions`（ユーザー投稿、`pending→approved/rejected`）/ `price_log`（価格相場の時系列ログ）。
トリガー2本: `on_auth_user_created`（サインアップ時に `public.users` へ自動作成）、`on_submission_approved`（投稿承認時に `price_log` へ実売価格を転記 ＋ 投稿者の `premium_until` を7日延長 = 「ナレッジ投稿でプレミアム付与」の課金導線）。
価格相場の集計は `get_price_stats(brand, era)` という Postgres 関数（SQL側でmin/max/avg/countを算出）に RPC で委譲しており、全件をクライアント/APIに取得して集計する設計にはなっていない（`mockClient.rpc()` が同じインターフェースをローカルで再現）。

**主要 API ルート**（`src/app/api/`）
- `diagnose/route.ts` — 画像2枚（全体・タグ）を Claude（`generateObject` + Zod スキーマ `diagnosisSchema`）に渡し、ブランド・年代・鑑定根拠・仕入れ判定を構造化出力させる。無料ユーザーは当月10回の利用制限あり（`createAdminClient` でRLSを越えてカウント）。画像は `uploadBase64Image`（`src/utils/supabase/storage.ts`）でアップロード前に `imageResize.ts` でリサイズ・圧縮される。
- `diagnose/history/route.ts` — 診断履歴の取得・削除
- `submissions/route.ts` — ナレッジ投稿の作成・一覧

**画面構成**（`src/app/`）：`page.tsx`（診断トップ）/ `auth/page.tsx`（ログイン・サインアップ）/ `history/page.tsx`（履歴一覧、`HistoryList.tsx` を使用）/ `diagnoses/[id]/page.tsx`（診断詳細、`DiagnosisView.tsx` を使用）/ `knowledge/submit/page.tsx`（ナレッジ投稿フォーム）。ナビゲーションは `components/Sidebar.tsx`（デスクトップ）と `components/BottomNav.tsx`（モバイル）に分離。
