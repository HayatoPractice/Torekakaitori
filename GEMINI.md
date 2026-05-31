# GEMINI.md — AIエージェント開発・自動化マスター（APP版）

<context>
このファイルは Gemini CLI / Antigravity が起動時に自動で読み込む最優先の指示書である。
共通ルールの実体は DOCS/APP_SHARED_RULES.md に一元管理されている。
このファイルは「Geminiエージェント固有の設定と起動手順」を担当する。
</context>

---

## 起動シーケンス（必須・スキップ禁止）

<startup_sequence>
<!-- 詳細手順は CLAUDE.md の起動シーケンス（STEP 1〜4）と完全同一。以下は要約。 -->

【STEP 1】必ず読む（2ファイル固定）
  ① AGENTS.md（ルート）  ② DOCS/DOCS_INDEX.md

【STEP 2】DOCS_INDEX.md「タスク別早見表」で必要ファイルのみ読む。
  セッション開始・現状把握時 → DOCS/PROJECT_STATE.md / DOCS/CONTEXT_BRIDGE.md

【STEP 3】インシデント管理（起動時・機能追加・編集・削除のたびに必須）
  _PRE_CHECKLIST.md → INCIDENT_INDEX.md「技術スタック別クイック検索」→ 関連インシデントのみ読む
  類似事例があれば「⚠️ 類似インシデント検出：[INC-XXX]」として報告する

【STEP 4】`<thinking>` で推論 + `git status` で環境チェック
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

→ `DOCS/OWNER_DEFAULTS.md` SECTION 7 を参照すること（一元管理のため）

---

## Gemini固有：モデル使い分けルール

<gemini_model_guide>
自分が現在どのモデルで動作しているかを意識し、タスクに応じて適切に対応すること。

**Gemini 2.5 Flash 向きのタスク（低コスト・高速）**
- 単一ファイル内の簡単なスペルミス修正・変数名の変更
- 静的な型エラーの修正（型が合わない等の単純作業）
- 関数の使い方の単純な質問
- テストの実行・結果の確認

Flash で動作している場合：余計な長文出力を抑え、極小のコンテキストでピンポイントに仕事を完遂すること。

**Gemini 2.5 Pro 向きのタスク（高品質・複雑推論）**
- プロジェクト全体の設計・複数ファイルにまたがるリファクタリング
- 複雑なロジックバグのデバッグと原因特定
- 新規コンポーネントや新機能のゼロからの設計・実装
- アーキテクチャの根幹に関わる設計判断
</gemini_model_guide>

---

## AI共通行動指針
セッション開始時に必ず `DOCS/APP_SHARED_RULES.md` を読み込み、記載された指針に従うこと。
（原本で一元管理 → 各プロジェクトへ配布。変更は原本側で行う）
