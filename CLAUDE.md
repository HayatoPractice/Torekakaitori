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
-->

【STEP 1】第1層：必ず読む（2ファイル固定）
  ① AGENTS.md（ルート）           ← トークン削減規範・AI行動原則
  ② DOCS/DOCS_INDEX.md           ← 全ファイルの索引・タスク別読込先

【STEP 2】第2層：作業内容に応じてピンポイントで読む
  DOCS_INDEX.md の「タスク別：読むべきファイル早見表」を参照して
  現在の作業に必要なファイルだけを選んで読み込む。

  セッション開始・現状把握が必要なら必ず読む：
    → DOCS/PROJECT_STATE.md
    → DOCS/CONTEXT_BRIDGE.md

  ⚠️ 設計・ライブラリ選定・新プロジェクト開始時は追加で必ず読む：
    → DOCS/CROSS_REFERENCE.md   ← アプリ種別×UI×ツール横断早見表・他カテゴリ流用パターン集
    → DOCS/UI_LIBRARY_GUIDE.md  ← UIライブラリ選定・共存設計（競合回避含む）
    → DOCS/TOOL_REFERENCE.md    ← 外部ツール・サービス全リファレンス

  ※ 他のファイルは作業中に必要になった時点で読む。起動時に全読みしない。

【STEP 3】インシデント管理の確認（起動時・機能追加・編集・削除のたびに必須）
  Step 1｜`/Users/sasakihayato/アプリ作成関連/アプリ作成/インシデント管理/_PRE_CHECKLIST.md` を読み、全チェック項目を確認する
  Step 2｜`/Users/sasakihayato/アプリ作成関連/アプリ作成/インシデント管理/INCIDENT_INDEX.md` の「技術スタック別クイック検索」で作業タグを照合する
  Step 3｜関連するインシデントファイルだけを読む（全ファイル読込は禁止）
  Step 4｜類似事例が見つかった場合は「⚠️ 類似インシデント検出：[INC-XXX]」として必ず報告する
  ※ 新機能追加・既存機能編集・機能削除のたびに Step 2〜3 を繰り返すこと

【STEP 4】読み込み完了後に実行
  - `<thinking>`：読み込んだ情報を分析し、現在のプロジェクト状態・教訓・次の一手を論理的に推論せよ。
  - 環境チェック：`git status` でローカルの状態を確認し、必要に応じてMCPやweb_fetchで情報補完せよ。
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
