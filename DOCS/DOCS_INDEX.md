# DOCS_INDEX.md — ナレッジベース索引（第1層・常時読込）
# 起動時はこのファイルだけ読む。作業内容に応じて第2層ファイルをピンポイントで参照する。
# 更新者：秘書チーム ｜ 更新タイミング：新ファイル追加・役割変更時

---

## ▌このファイルの役割と効果

```
旧方式：起動時に全DOCSファイルを読込 → 約25,000〜35,000トークン消費
新方式：このINDEXだけ読んで作業判断 → 約500トークン（約1/60 の節約）
        必要なファイルだけをその都度ピンポイントで読込
```

---

## ▌全ファイル一覧（3行サマリ）

| ファイル名 | 読込タイミング | 内容サマリ |
|---|---|---|
| **DOCS_INDEX.md**（本ファイル） | 毎回・起動時必須 | 全ファイルの索引。タスク別の読込先を示す |
| **PROJECT_STATE.md** | セッション開始時 | 現在のプロジェクト進捗・直近の課題・次のアクション |
| **CONTEXT_BRIDGE.md** | セッション開始時 | 前回セッションの状態スナップショット・引き継ぎ事項 |
| **OWNER_DEFAULTS.md** | 技術選定・判断時 | スタック標準・Kill基準・収益化・AI/モデル選定基準 |
| **SERVICE_ORG_CORE.md** | 役割・フロー確認時 | チーム役割定義・開発フロー・ライブラリ採用手順 |
| **SERVICE_ORG_PHASE.md** | フェーズ確認時 | 開発フェーズ定義・チーム構成・マイルストーン |
| **REQUIREMENTS_LOG.md** | 要件・バージョン確認時 | 機能要件・技術的負債・バージョンロック記録 |
| **LEARNING_LOG.md** | 振り返り・記録時 | プロジェクト内の詳細な作業記録・出来事ログ |
| **MASTER_LESSONS.md** | 実装前・バグ修正前 | 全プロジェクト横断の汎用教訓集（ミス防止・設計パターン・Git安全設計） |
| **MASTER_REFERENCE.md** | 戦略・アーキテクチャ確認時 | AI活用・プロンプト工学・自動化ワークフロー統合リファレンス |
| **CLAUDE_CODE_GUIDE.md** | ツール操作・CLI使用時 | Claude Code/Gemini CLIコマンド・Antigravityコマンド・Git黄金パターン |
| **BIO_PIPELINE_INSIGHTS.md** | 自動化パイプライン設計時 | パイプライン構築・複雑な自動化フローの知見 |
| **STARTUP_GUIDE.md** | 環境構築・初回セットアップ時 | 環境セットアップ手順・起動コマンド |
| **UI_LIBRARY_GUIDE.md** | UI実装・ライブラリ選定時 | 6大UIライブラリ共存設計・目的別ライブラリ選定ガイド |
| **CROSS_REFERENCE.md** | 設計・ライブラリ選定時 / 新プロジェクト開始時 | アプリ種別×UI×ツール×フェーズの横断早見表。他カテゴリからの流用パターン集 |
| **APP_SHARED_RULES.md** | 規約・ルール確認時 | 全アプリ共通の行動ルール・禁止事項 |
| **APP_STRUCTURE_REFERENCE.md** | 設計・ファイル配置時 | アプリ構造パターン・ディレクトリ設計規則 |
| **AUTO_SYNC_GUIDE.md** | データ同期設計時 | 自動同期・外部サービス連携の設計ガイド |
| **TOOL_REFERENCE.md** | ツール・サービス選定時 | Google Workspace / GCP / AI / 画像生成 / 外部連携ツール全リファレンス |
| **GITHUB_ACTIONS_GUIDE.md** | CI/CD設計時 / セキュリティ設計時 | Lint・型チェック・テスト・セキュリティスキャン・バージョン確認のYAML実装例 |

---

## ▌タスク別：読むべきファイル早見表

| やること | 必読ファイル | 任意参照 |
|---|---|---|
| **セッション開始・現状把握** | PROJECT_STATE.md, CONTEXT_BRIDGE.md | OWNER_DEFAULTS.md |
| **新プロジェクト開始** | OWNER_DEFAULTS.md, SERVICE_ORG_CORE.md, CROSS_REFERENCE.md | SERVICE_ORG_PHASE.md |
| **UI・フロントエンド実装** | UI_LIBRARY_GUIDE.md, CROSS_REFERENCE.md §2 | MASTER_LESSONS.md |
| **バグ修正・デバッグ** | MASTER_LESSONS.md | REQUIREMENTS_LOG.md |
| **AI / LLM 機能の追加** | OWNER_DEFAULTS.md §AI選定, TOOL_REFERENCE.md §G | MASTER_REFERENCE.md |
| **モデル選定（Claude/Gemini等）** | OWNER_DEFAULTS.md §SECTION10 | TOOL_REFERENCE.md §G |
| **プロンプト設計** | PROMPT_ENGINEERING_MASTER.md | MASTER_REFERENCE.md |
| **外部ツール・連携先を探す** | TOOL_REFERENCE.md | OWNER_DEFAULTS.md §スタック |
| **自動化・スケジュール設計** | TOOL_REFERENCE.md §自動化パターン, CLAUDE_CODE_GUIDE.md | BIO_PIPELINE_INSIGHTS.md |
| **インフラ・デプロイ選定** | OWNER_DEFAULTS.md §デプロイ, TOOL_REFERENCE.md §E | — |
| **セキュリティ設計** | TOOL_REFERENCE.md §I, GITHUB_ACTIONS_GUIDE.md §5 | OWNER_DEFAULTS.md §法務 |
| **CI/CD・自動化設計** | GITHUB_ACTIONS_GUIDE.md | SERVICE_ORG_CORE.md §CI/CD |
| **画像・アセット生成** | TOOL_REFERENCE.md §L | — |
| **Git操作・ブランチ戦略** | CLAUDE_CODE_GUIDE.md §Git | MASTER_LESSONS.md |
| **Google Workspace 連携** | TOOL_REFERENCE.md §D | OWNER_DEFAULTS.md §スタック |
| **教訓の確認・昇格** | MASTER_LESSONS.md | LEARNING_LOG.md |
| **要件・スペック確認** | REQUIREMENTS_LOG.md | PROJECT_STATE.md |
| **CLI操作・コマンド確認** | CLAUDE_CODE_GUIDE.md | — |

---

## ▌インシデント管理（起動時チェック）

```
Step 1｜_PRE_CHECKLIST.md を読み、全チェック項目を確認する
Step 2｜INCIDENT_INDEX.md の「技術スタック別クイック検索」で関連タグを照合する
Step 3｜関連するインシデントファイルだけを読む（全読み不要）
Step 4｜類似事例があれば「⚠️ 類似インシデント検出：[INC-XXX]」として報告する
※ 新機能追加・既存機能編集・削除のたびに Step 2〜3 を繰り返す
```

---

## ▌読込コスト目安

| 読込パターン | 目安トークン | 用途 |
|---|---|---|
| INDEX のみ（起動時最小） | ~500 | 作業判断・ファイル特定 |
| INDEX + PROJECT_STATE + CONTEXT_BRIDGE | ~2,500 | 通常のセッション開始 |
| INDEX + タスク関連2〜3ファイル | ~4,000〜6,000 | 実装・設計作業 |
| 全ファイル一括（旧方式・非推奨） | ~30,000+ | 不要・使わない |

---

DOCS_INDEX.md v1.0 — 第1層・常時読込。このファイルだけが起動時の必須読込対象。
