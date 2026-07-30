# MINUTES.md — 作業議事録（AI セッション引き継ぎ用）
最終更新：2026-06-21 | セッション #3

---

## ★ TL;DR — 次の AI はここだけ読めば再開できる

| 項目 | 内容 |
|:---|:---|
| 現在地 | Phase 1 & Phase 2｜開発完了＋品質改善TODO対応済（残TODO #5/#7 を本セッションで実装） |
| 前回完了 | コミット 24418bb で高/中優先TODOの大半（Server Component化・crypto.randomUUID・error instanceof Error・5MB制限・履歴削除）を実装済 |
| 本セッション完了 | #5 画像リサイズ/圧縮（src/utils/imageResize.ts 追加・両アップロード画面に組込）、#4 残存catch(err:any)修正、#7 価格集計をPostgres関数 get_price_stats へRPC化＋mockClientにrpc対応追加。`npm run build`（型チェック含む）パス |
| 次のタスク | Supabaseクラウドへ schema.sql 適用（get_price_stats 関数を含む）、.env.local 設定、Vercel本番デプロイ。残：#9 実売価格の蓄積戦略（戦略課題）。／原本ルール整理の続き：別セッションで `/doctor` を実行し、手作業クリーンアップで見落とした重複がないか確認 |
| 注意事項 | mockClient.ts は環境変数未設定時のフォールバックとして現役使用中（削除禁止）。/api/price-trend は既に存在しない。estimated_price は diagnoses ではなく price_log.price に記録済。本番では schema.sql の get_price_stats 関数の適用を忘れないこと。 |

---

## 開発情報

| 項目 | 設定値 |
|:---|:---|
| アプリ名 | VintVerify (ヴィントベリファイ) |
| リポジトリURL | - |
| 技術スタック | Next.js, Supabase (Auth, DB, Storage), Claude 3.5 Sonnet (API), Vercel |
| パフォーマンス目標 | LCP < 2.5s, INP < 200ms |

## アクティブチーム一覧

| 役割名 | 状態 | 招集日 | 担当ファイル（src/以下） | 現在のタスク |
|-------|------|-------|----------------------|------------|
| 秘書 | 稼働中 | 2026-06-17 | - | 全体調整、進捗管理、社長報告 |
| PM | 稼働中 | 2026-06-17 | - | MINUTES.md更新、TODO管理 |
| 記録チーム | 稼働中 | 2026-06-17 | - | 要件ログ・教訓管理 |

---

## セッション履歴（新しい順）

### SESSION #3 — 2026-06-21

#### タスクログ
- ✅ **品質改善TODOの実態調査** — 提示された9項目TODOのうち、#1〜#4/#6/#8 はコミット 24418bb で実装済と判明。`/api/price-trend` は不在、`uuid` も未使用、`estimated_price` は price_log へ正しく記録済、`mockClient.ts` は現役使用中（削除不可）と確認。
- ✅ **#5 画像リサイズ/圧縮** — `src/utils/imageResize.ts` を新規作成（canvasで長辺1568px・JPEG品質0.85へ圧縮）。`src/app/page.tsx` と `src/app/knowledge/submit/page.tsx` の `handleFileChange` に組込。 `変更: src/utils/imageResize.ts, src/app/page.tsx, src/app/knowledge/submit/page.tsx`
- ✅ **#4 残存catch修正** — `knowledge/submit/page.tsx` の `catch (err: any)` を `error instanceof Error` パターンへ統一。
- ✅ **#7 価格集計のSQL集計化** — Postgres関数 `get_price_stats(p_brand, p_era)` を `schema.sql` に追加し、`diagnoses/[id]/page.tsx` の相場サマリをRPC1回の集計に置換（非プレミアムは全件取得が発生しない）。月別トレンドはプレミアム時のみ全件取得。`mockClient.ts` に `rpc()` シミュレーションを追加。 `変更: supabase/schema.sql, src/app/diagnoses/[id]/page.tsx, src/utils/supabase/mockClient.ts`
- ✅ **ビルド検証** — `npm run build`（TypeScript型チェック含む）がパス。

#### 重要事項
- `#決定` ユーザー指示により、残TODOを承認なしで完成まで自走対応。#7も含めて実装。
- `#注意` mockClient.ts は削除禁止（環境変数未設定時のフォールバック）。/api/price-trend は既に不在。

### SESSION #2 — 2026-06-17 22:20

#### タスクログ
- 22:10 ✅ **Next.jsプロジェクト初期化** — `vint-verify` 一時ディレクトリにて初期化後、ファイルをルートに配置。 `変更: tsconfig.json, package.json, src/*, public/*`
- 22:12 ✅ **Supabaseスキーマ設計** — 各テーブルとRLS、トリガー関数をまとめたSQL定義を作成。 `変更: supabase/schema.sql`
- 22:15 ✅ **APIとAI連携の実装** — 画像診断、履歴、トレンド、知見投稿のエンドポイントを実装。 `変更: src/app/api/*`
- 22:18 ✅ **フロントエンドUI実装** — 各画面と共通ボトムナビゲーションをダーク＆ゴールド調の高級感あるデザインで構築。 `変更: src/app/*, src/components/*`
- 22:20 ✅ **品質検証とウォークスルー作成** — `npm run build` のパス確認および `walkthrough.md` の作成。 `変更: src/utils/supabase/*, walkthrough.md`

#### 重要イベント
- 22:10 `#決定` **プロダクト名の決定**
  - 選択肢: VintVerify (承認) / RagFinder / OldLabel
  - 採用: VintVerify (ヴィントベリファイ)
  - 理由: ユーザー（社長）の承認による。
  - 影響ファイル: `implementation_plan.md`

- 22:11 `#決定` **料金体系と投稿報酬仕様の決定**
  - 採用: 無料月10回制限 / プレミアム月980円 / 投稿採用で7日間解放
  - 理由: ユーザー（社長）の承認による。
  - 影響ファイル: `implementation_plan.md`

### SESSION #1 — 2026-06-17 22:00

#### タスクログ
- 22:00 ✅ **要件定義書の解析と要件登録** — ユーザーより提供された要件定義書からREQ-001〜REQ-014を整理し、`REQUIREMENTS_LOG.md` に書き込み完了。 `変更: DOCS/REQUIREMENTS_LOG.md`
- 22:05 ✅ **セッション議事録の初期化** — `MINUTES.md` を新規作成して初期化完了。 `変更: MINUTES.md`

#### 重要イベント
- 22:00 `#決定` **基本技術スタックの採用**
  - 選択肢: Next.js + Supabase + Claude API
  - 採用: Next.js + Supabase + Claude API
  - 理由: 要件定義書の指定に基づく。
  - 影響ファイル: `REQUIREMENTS_LOG.md`
