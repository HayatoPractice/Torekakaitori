📁 アプリ開発組織 — ファイルマップ v2.0
このファイルはプロジェクト構造の「地図」である。
起動時の読込順序は CLAUDE.md → DOCS_INDEX.md に従うこと（このファイルを起動時に全読みしない）。

▌変更履歴
バージョン  日付          変更内容                                    変更者
v1.0        初版          ビジネス版から分離・アプリ特化版新規作成       秘書
v2.0        2026-05-29    2層構造読込方式への移行・新ファイル群の追加反映  秘書

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌このファイル群の用途

アプリ・Webサービス・ツールのコーディングに特化した組織運営ファイル群。
ビジネス立ち上げ・事業計画には対応しない。コーディングのみに集中する。
使用環境：Claude Code + Antigravity（ローカルフォルダに実ファイルを作成）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌起動時の読込方式：2層構造（トークン最小化）

```
【旧方式（廃止）】全DOCSファイルを起動時に順番読込 → 約30,000トークン消費
【新方式（現行）】2層構造でピンポイント読込 → 約1/10以下のトークン消費

第1層（起動時・必ず読む・2ファイル固定）
  ① AGENTS.md（ルート）     ← AI行動規範・トークン削減規範
  ② DOCS/DOCS_INDEX.md     ← 全ファイルの索引・タスク別読込先

第2層（作業内容に応じてピンポイントで読む）
  DOCS_INDEX.md の「タスク別：読むべきファイル早見表」で判断して必要なものだけ読む
  セッション開始・現状把握時は PROJECT_STATE.md + CONTEXT_BRIDGE.md も読む
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌セッション開始時のモード（冒頭で必ず確認する）

  ┌─────────────────────────────────────────────────────┐
  │ MODE N：新規アプリ作成                                │
  │   用途：ゼロから新しいアプリを作る                     │
  │   起動：新規作成フローへ（SERVICE_ORG_CORE.md参照）    │
  ├─────────────────────────────────────────────────────┤
  │ MODE R：途中再開                                      │
  │   用途：前回の続きから実装を再開する                   │
  │   起動：途中再開フローへ（SERVICE_ORG_CORE.md参照）    │
  └─────────────────────────────────────────────────────┘

  モード未宣言の場合：
  PROJECT_STATE.mdのlast_completedを確認して自動判定する。
  判定できない場合は「新規作成ですか？途中再開ですか？」と確認する。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌全ファイル一覧と層定義

【第1層：起動時必ず読む（毎回・固定）】
ファイル                  役割
AGENTS.md（ルート）        AI行動規範・トークン削減指示書
DOCS/DOCS_INDEX.md        全ファイル索引・タスク別読込先・読込コスト目安 ★

【第2層-A：セッション開始時に読む（現状把握）】
DOCS/PROJECT_STATE.md     現在地・開発情報・タスクボード
DOCS/CONTEXT_BRIDGE.md    前回セッションの状態・引き継ぎ事項

【第2層-B：実装・設計時に読む（必要な時だけ）】
DOCS/OWNER_DEFAULTS.md          技術スタック標準・Kill基準・AI選定基準・収益化方針
DOCS/MASTER_LESSONS.md          全プロジェクト横断の汎用教訓集（ミス防止・設計パターン）
DOCS/SERVICE_ORG_CORE.md        チーム役割定義・開発フロー・ライブラリ採用手順
DOCS/SERVICE_ORG_PHASE.md       開発フェーズ定義・チーム構成
DOCS/UI_LIBRARY_GUIDE.md        6大UIライブラリ共存設計・目的別選定ガイド
DOCS/CLAUDE_CODE_GUIDE.md       Claude Code/Gemini CLI操作・Git黄金パターン ★
DOCS/TOOL_REFERENCE.md          外部ツール全リファレンス（GCP/Workspace/画像生成/自動化） ★

【第2層-C：特定作業時のみ読む（オンデマンド）】
DOCS/REQUIREMENTS_LOG.md          機能要件・技術的負債・バージョンロック記録
DOCS/LEARNING_LOG.md              プロジェクト内の詳細な作業記録（参照専用）
DOCS/PROMPT_ENGINEERING_MASTER.md プロンプト技法・XML構造化・Few-Shot設計
DOCS/MASTER_REFERENCE.md          AI活用・アーキテクチャ統合リファレンス
DOCS/BIO_PIPELINE_INSIGHTS.md     パイプライン構築・複雑な自動化フローの知見
DOCS/STARTUP_GUIDE.md             環境セットアップ手順・起動コマンド
DOCS/APP_SHARED_RULES.md          全アプリ共通行動ルール・禁止事項
DOCS/APP_STRUCTURE_REFERENCE.md   アプリ構造パターン・ディレクトリ設計規則
DOCS/AUTO_SYNC_GUIDE.md           自動同期・外部サービス連携設計ガイド

▌ファイル層別変更権限

ファイル                    層               変更権限                    変更頻度
AGENTS.md                  🔒 不変層        社長承認必須                ほぼ変えない
README.md                  🔒 不変層        社長承認必須（構造変更時）   ファイル構成変化時
SERVICE_ORG_CORE.md        🔒 不変層        社長承認必須                ほぼ変えない
DOCS_INDEX.md              📌 要更新        秘書変更・社長事後報告       ファイル追加時
SERVICE_ORG_PHASE.md       📌 フェーズ更新層  秘書変更・社長事後報告      フェーズ移行時
PROJECT_STATE.md           🔄 随時更新層    PMが変更                    随時
CONTEXT_BRIDGE.md          🔄 随時更新層    記録チームが自動更新         セッション終了時
REQUIREMENTS_LOG.md        🔄 随時更新層    PMが変更                    随時
LEARNING_LOG.md            🔄 随時更新層    記録チームが転記             完了時
MASTER_LESSONS.md          🔄 随時更新層    記録チームが昇格判断・追記   教訓発生時
OWNER_DEFAULTS.md          🔄 随時更新層    社長が直接更新              判断基準変更時
TOOL_REFERENCE.md          🔄 随時更新層    秘書が追記                  ツール情報変更時
CLAUDE_CODE_GUIDE.md       🔄 随時更新層    秘書が追記                  ツール追加時

変更マークの定義
🔄 随時更新可    → 自律的に変更できる
📌 要社長事後報告 → 変更後に社長へ報告する
🔒 変更要社長承認 → 変更前に必ず社長の承認を得る

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌プロジェクトフォルダ構成

PROJECT_ROOT/
 ├── 📄 .antigravityignore         ← 静的除外フィルター（原本から複製）
 ├── 📄 .geminiignore              ← 静的除外フィルター（原本から複製）
 ├── 📄 .aiexclude                 ← 静的除外フィルター（原本から複製）
 ├── 📄 AGENTS.md                  ← AI行動規範・トークン削減指示書（ルート直下）
 ├── 📄 CLAUDE.md                  ← Claude Code起動時の最優先指示書（ルート直下）
 ├── 📁 scripts/                   ← 開発ユーティリティスクリプト
 │    └── 📄 skeletonizer.py       ← コードシグネチャ抽出スクリプト（Python）
 ├── 📁 DOCS/                      ← 必須mdファイル格納
 │    ├── README.md                ← 全体地図・ファイル構成（本ファイル）
 │    ├── DOCS_INDEX.md            ← ★第1層：全ファイル索引・タスク別読込先
 │    ├── PROJECT_STATE.md         ← 現在地・開発情報・タスクボード
 │    ├── CONTEXT_BRIDGE.md        ← セッション間の状態橋渡し
 │    ├── SERVICE_ORG_CORE.md      ← 組織ルール・開発フロー定義
 │    ├── SERVICE_ORG_PHASE.md     ← 開発フェーズ・チーム構成
 │    ├── REQUIREMENTS_LOG.md      ← 要件記録・技術的負債・バージョンロック
 │    ├── LEARNING_LOG.md          ← プロジェクト内の詳細記録
 │    ├── MASTER_LESSONS.md        ← 全プロジェクト横断の汎用教訓集
 │    ├── OWNER_DEFAULTS.md        ← 技術スタック・Kill基準・AI選定（原本からコピー）
 │    ├── MASTER_REFERENCE.md      ← AI活用・アーキテクチャ統合リファレンス
 │    ├── CLAUDE_CODE_GUIDE.md     ← ★CLIコマンド・Git戦略・Antigravityガイド
 │    ├── TOOL_REFERENCE.md        ← ★外部ツール全リファレンス辞書
 │    ├── UI_LIBRARY_GUIDE.md      ← UIライブラリ共存・目的別選定ガイド（原本からコピー）
 │    ├── APP_SHARED_RULES.md      ← AI共通行動指針（原本からコピー）
 │    ├── APP_STRUCTURE_REFERENCE.md ← アプリ構造パターン・設計規則
 │    ├── AUTO_SYNC_GUIDE.md       ← 自動同期・連携設計ガイド
 │    ├── STARTUP_GUIDE.md         ← 環境セットアップ・起動手順書
 │    ├── PROMPT_ENGINEERING_MASTER.md ← プロンプト技法
 │    └── BIO_PIPELINE_INSIGHTS.md ← パイプライン構築知見
 ├── 📁 BDR/                       ← 意思決定記録（Phase別）
 ├── 📁 src/                       ← コードファイル
 ├── 📁 demo/                      ← デモファイル・デモ結果
 └── 📁 ARCHIVE/                   ← アーカイブ済みファイル

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌新プロジェクト開始時のチェックリスト

【毎回持っていく（変えない・そのまま使う）】
□ .antigravityignore   → ルートに配置
□ .geminiignore        → ルートに配置
□ .aiexclude           → ルートに配置
□ AGENTS.md            → ルートに配置
□ CLAUDE.md            → ルートに配置
□ scripts/             → skeletonizer.py込みでルートに配置
□ README.md            → そのまま使う
□ DOCS_INDEX.md        → ★そのまま使う（新規ファイルを追加したら更新）
□ SERVICE_ORG_CORE.md  → そのまま使う
□ MASTER_LESSONS.md    → 蓄積した教訓ごと持っていく（リセット不要）
□ MASTER_REFERENCE.md  → そのまま使う
□ OWNER_DEFAULTS.md    → 原本から最新版をコピー
□ APP_SHARED_RULES.md  → 原本から最新版をコピー
□ UI_LIBRARY_GUIDE.md  → 原本から最新版をコピー
□ CLAUDE_CODE_GUIDE.md → ★原本から最新版をコピー
□ TOOL_REFERENCE.md    → ★原本から最新版をコピー
□ STARTUP_GUIDE.md     → そのまま使う
□ PROMPT_ENGINEERING_MASTER.md → そのまま使う

【リセットして新規作成する】
□ PROJECT_STATE.md     → 全項目リセット・新プロジェクト情報を記入
□ SERVICE_ORG_PHASE.md → 必要なチーム構成に書き換える
□ REQUIREMENTS_LOG.md  → 新規作成
□ LEARNING_LOG.md      → 新規作成
□ CONTEXT_BRIDGE.md    → 新規作成（記録チームが自動作成・空欄投入でもOK）
□ APP_STRUCTURE_REFERENCE.md → プロジェクト構造に合わせて作成
□ AUTO_SYNC_GUIDE.md   → 同期設計が必要な場合のみ作成

【アーカイブする】
□ 前プロジェクトのBDR → ARCHIVE/[PJ名]_BDR/
□ 前プロジェクトのCONTEXT_BRIDGE.md → ARCHIVE/[PJ名]_CONTEXT/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌秘書へのセッション開始指示（2層構造版）

> 【環境による使い分け】
> Claude Code（CLI・VSCode拡張）使用時：CLAUDE.md が自動読込されるため、この手順は不要。
> Antigravity・通常チャット使用時：この手順に従って手動でセッションを開始すること。

秘書（AIの役割のひとつ）は以下の順番で即座に実行する：

STEP 1｜AGENTS.md（ルート）を読み、AI行動規範・トークン削減規範を確認する
STEP 2｜DOCS/DOCS_INDEX.md を読み、全ファイルの索引とタスク別読込先を把握する
STEP 3｜DOCS/PROJECT_STATE.md を読み、現在地・開発情報・タスクボードを把握する
STEP 4｜DOCS/CONTEXT_BRIDGE.md を読み、前回セッションの状態を引き継ぐ
        → 存在しない・空欄の場合：記録チームに新規作成を指示する
STEP 5｜DOCS_INDEX.md の「タスク別早見表」で現在の作業に必要なファイルだけを追加読込する
        → 例：実装作業なら MASTER_LESSONS.md、UI作業なら UI_LIBRARY_GUIDE.md
        → ※ 必要ないファイルは読まない（トークン節約）
STEP 6｜モードを判定してから以下を社長に報告する

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌セッション再開報告フォーマット

【セッション再開報告】秘書

現在のフェーズ：[Phase N：フェーズ名]
モード：[新規作成 / 途中再開]
アプリ名：[app_name]
技術スタック：[tech_stackより抜粋]
前回の最終タスク：[CONTEXT_BRIDGEより / 新規の場合「なし」]
実装ループ現在地：[設計/実装/検証/デモ待ち/品質チェック待ち/修正/完了]
未解決ブロッカー：[件数]件（なければ「なし」）
参考教訓：[ML-XXX（一言）/ なし]
社長への確認事項：[あれば / なければ「なし」]

続きから進めます。ご指示をお待ちしています。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌ファイル間の依存関係マップ

README.md / DOCS_INDEX.md → 全ファイルの案内役（他ファイルを参照する）
SERVICE_ORG_CORE.md       → SERVICE_ORG_PHASE.md / PROJECT_STATE.md
SERVICE_ORG_PHASE.md      → PROJECT_STATE.md / REQUIREMENTS_LOG.md
PROJECT_STATE.md          → なし（他ファイルがここを参照するだけ）
REQUIREMENTS_LOG.md       → PROJECT_STATE.md
LEARNING_LOG.md           → なし（参照専用）
CONTEXT_BRIDGE.md         → 全チームが参照（セッション開始時の状態把握）
MASTER_LESSONS.md         → 全チームが参照（参考教訓の提示）
OWNER_DEFAULTS.md         → 技術選定・kill判断・価格設定・AI選定時に参照
TOOL_REFERENCE.md         → ツール選定・連携設計時に参照（辞書）
CLAUDE_CODE_GUIDE.md      → CLI操作・Git作業時に参照

README.md v2.0（アプリ特化版）— 🔒不変層。変更には社長承認必須。
