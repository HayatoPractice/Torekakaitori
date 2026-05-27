# CLAUDE.md — AIエージェント開発・自動化マスター（APP版）

<context>
このファイルはプロジェクトの「脳」であり、Claude Code・VSCode・Cursorが起動時に自動で読み込む最優先の指示書である。最新のプロンプト工学と自律開発サイクルの知見が統合されている。
</context>

---

## 起動シーケンス（必須・スキップ禁止）

<startup_sequence>
1. `AGENTS.md`（ルート）および `DOCS/MASTER_REFERENCE.md` を読み込み、トークン削減規範と最新AI知見を同期する。
2. 以下の順番でDOCSフォルダのファイルを全て読み込む。
   ① DOCS/README.md                        ← 全体地図・ファイル構成
   ② DOCS/PROJECT_STATE.md                 ← 現在地（※全ファイルの参照前提）
   ③ DOCS/SERVICE_ORG_CORE.md              ← 組織ルール・開発フロー
   ④ DOCS/SERVICE_ORG_PHASE.md             ← フェーズ・チーム定義
   ⑤ DOCS/CONTEXT_BRIDGE.md               ← 前回セッションの状態
   ⑥ DOCS/REQUIREMENTS_LOG.md             ← 要件・技術的負債
   ⑦ DOCS/LEARNING_LOG.md                 ← 学習記録
   ⑧ DOCS/MASTER_LESSONS.md               ← 汎用教訓集
   ⑨ DOCS/OWNER_DEFAULTS.md               ← 技術スタック・Kill基準
   ⑩ DOCS/STARTUP_GUIDE.md                ← 起動・運用手順
   ⑪ DOCS/CLAUDE_CODE_GUIDE.md            ← Claude Codeツール運用ガイド
   ⑫ DOCS/PROMPT_ENGINEERING_MASTER.md    ← プロンプト技法
   ⑬ DOCS/BIO_PIPELINE_INSIGHTS.md        ← パイプライン構築知見
3. 【必須】インシデント管理フォルダを確認する（起動時・機能追加・編集・削除のたびに必須）：
   Step 1｜`/Users/sasakihayato/アプリ作成関連/アプリ作成/インシデント管理/_PRE_CHECKLIST.md` を読み、全チェック項目を確認する
   Step 2｜`/Users/sasakihayato/アプリ作成関連/アプリ作成/インシデント管理/INCIDENT_INDEX.md` を読み、「技術スタック別クイック検索」で作業に関係するタグを照合する
   Step 3｜関連するインシデントファイルだけを読む（全ファイルを読む必要はない）
   Step 4｜類似事例が見つかった場合は「⚠️ 類似インシデント検出：[INC-XXX / ファイル名]」として必ず報告する
   ※ 起動時の1回だけでなく、新機能追加・既存機能編集・機能削除を行うたびに Step 2〜3 を繰り返すこと
4. 読み込み完了後、以下を実行する：
   - `<thinking>`：全ファイルを分析し、現在のプロジェクト状態、教訓、次の一手を論理的に推論せよ。
   - 環境チェック：`git status` およびプロジェクト固有の依存関係を確認し、必要に応じてMCPやweb_fetchでの情報補完を検討せよ。
</startup_sequence>

---

## 基本行動原則（Core Directives）

<rules>
- **Team Dynamics First:** 常に [Secretary / PM / QA / Record / Architect / Developer] の役割を動的に切り替え、各チームの責任（SERVICE_ORG_CORE.md参照）を全うせよ。
- **Thinking First (Consensus):** 重大判断・デバッグ時は `<thinking>` タグ内で「前提・リスク・代替案」を検討し、必要なら複数役割による合議制で解決策を導け。
- **XML Structuring:** 全てのコード生成、報告、推論はXMLタグを用いて論理的に構造化せよ。
- **Empirical Validation:** バグ修正時は「再現テスト」を先行させ、「ゼロ・レグレッション・テスト生成」を含む全層検証を完遂せよ。
- **Context Efficiency (Garbage Collection):** 外科的編集に加え、AGENTS.mdの指示に基づき、.antigravityignoreの徹底遵守、scripts/skeletonizer.pyによる段階的ファイル読込、エラーログの圧縮（GC）を完璧に実行せよ。
- **Self-Evolution:** 記録チームは学びを自動昇格させ、秘書は常に最新のtech_stack提案やAha Moment検証を自律的に行え。
</rules>

---

## プロジェクト管理 & 学習

<management>
- **MASTER_LESSONS.md:** 全アプリ共有のマスターソース。新発見やミスがあれば、Few-Shot形式（Before/After）で追記せよ。
- **Dynamic Context:** `LEARNING_LOG.md` に自己修正ログを記録し、次回のセッションに活かせ。
- **Git Strategy:** 意味のある最小単位でコミットし、プロンプト工学に基づいた詳細なメッセージを作成せよ。
- **Incident Management:** 不具合・ミスを解決したら必ず `/Users/sasakihayato/アプリ作成関連/アプリ作成/インシデント管理/` に記録せよ。`_TEMPLATE.md` を使用し、ファイル名は `YYYY-MM-DD_[アプリ名]_[概要].md` 形式とする。frontmatter の `tags:` を正確に記入し、`INCIDENT_INDEX.md` の技術スタック別クイック検索・全インシデント一覧・カテゴリ別統計を更新すること。汎用パターンは `MASTER_LESSONS.md` にも昇格させること。
- **Incident Reference During Implementation:** 機能追加・既存機能の編集・機能削除を行うたびに毎回 `INCIDENT_INDEX.md` の「技術スタック別クイック検索」で関連インシデントを確認せよ。起動時の1回だけでなく、作業の単位ごとに都度参照すること。
</management>

---

## 起動報告フォーマット

→ `DOCS/README.md`「セッション再開報告」のフォーマットを使用すること（一元管理のため）

---

## 型安全スタック標準

→ `DOCS/OWNER_DEFAULTS.md` SECTION 7 を参照すること（一元管理のため）

---

## AI共通行動指針
セッション開始時に必ず `DOCS/APP_SHARED_RULES.md` を読み込み、記載された指針に従うこと。
（原本で一元管理 → 各プロジェクトへ配布。変更は原本側で行う）
