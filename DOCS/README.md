📁 アプリ開発組織 — ファイルマップ v1.0
セッション開始時に最初に読むファイル。
このファイルを読んだ後、必ずPROJECT_STATE.mdを読んでから動作を開始すること。
全ての判断はPROJECT_STATE.mdを読んだ状態を前提とする。

▌変更履歴
バージョン  日付    変更内容                          変更者
v1.0        初版    ビジネス版から分離・アプリ特化版新規作成  秘書

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▌このファイル群の用途

アプリ・Webサービス・ツールのコーディングに特化した組織運営ファイル群。
ビジネス立ち上げ・事業計画には対応しない。コーディングのみに集中する。
使用環境：Claude Code + Antigravity（ローカルフォルダに実ファイルを作成）

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

▌ファイル構成と読み込み順序

【基本6ファイル】毎回投入・セッション開始時に以下の順で読み込む
① README.md              ← 今読んでいるファイル（全体地図）
② PROJECT_STATE.md       ← 現在地・開発情報・タスクボード
③ SERVICE_ORG_CORE.md    ← 組織ルール・開発フロー定義（変えない層）
④ SERVICE_ORG_PHASE.md   ← 開発フェーズ・チーム構成
⑤ REQUIREMENTS_LOG.md   ← 要件記録・技術的負債・デモ・品質記録
⑥ LEARNING_LOG.md       ← プロジェクト内の詳細記録（参照専用）

【7つ目】プロジェクト固有・記録チームが生成・管理
⑦ CONTEXT_BRIDGE.md     ← セッション間の状態橋渡し
   生成：プロジェクト開始時に記録チームが自動作成
   更新：セッション終了時・フェーズ移行時に自動更新
   空欄でも投入OK（記録チームが自動記入する）

【8つ目】全プロジェクト横断・永続的に育てる参考資料
⑧ MASTER_LESSONS.md     ← 汎用教訓・ミスシート
   投入：毎回必ず投入する（空欄でもOK）
   反映：参考扱い・採用は社長が判断する
   例外：🟢フィードバックパターンのみ常時適用

【追加読込】セッション開始時に必ず確認する
⑨ PROJECT_STATE.md内「開発情報」セクション
   ← tech stack / アーキテクチャ / 実装ループ現在地 / テスト方針

【全プロジェクト横断・常時参照】
⑩ OWNER_DEFAULTS.md ← リソース制約・デフォルト技術スタック・Kill基準・収益化ルール
   場所：アプリ作成/アプリ作成原本/OWNER_DEFAULTS.md（各プロジェクトのDOCSにもコピー）
   参照タイミング：新規プロジェクト開始時・技術選定時・価格設定時・Kill判断時

▌ファイル層別定義と変更権限
ファイル                  層               変更権限                    変更頻度
SERVICE_ORG_CORE.md      🔒 不変層        社長承認必須                ほぼ変えない
SERVICE_ORG_PHASE.md     📌 フェーズ更新層  秘書変更・社長事後報告       フェーズ移行時
PROJECT_STATE.md         🔄 随時更新層    PMが変更                    随時
REQUIREMENTS_LOG.md      🔄 随時更新層    PMが変更                    随時
LEARNING_LOG.md          🔄 随時更新層    記録チームが転記             完了時
README.md                🔒 不変層        社長承認必須（構造変更時）    ファイル構成変化時
CONTEXT_BRIDGE.md        🔄 随時更新層    記録チームが自動更新         セッション終了時
MASTER_LESSONS.md        🔄 随時更新層    記録チームが昇格判断・追記   教訓発生時
OWNER_DEFAULTS.md        🔄 随時更新層    社長が直接更新              判断基準が変わった時

変更マークの定義
🔄 随時更新可    → 自律的に変更できる
📌 要社長事後報告 → 変更後に社長へ報告する
🔒 変更要社長承認 → 変更前に必ず社長の承認を得る

▌ファイル間の依存関係マップ
README.md         → 全ファイルに影響
SERVICE_ORG_CORE.md → SERVICE_ORG_PHASE.md / PROJECT_STATE.md
SERVICE_ORG_PHASE.md → PROJECT_STATE.md / REQUIREMENTS_LOG.md
PROJECT_STATE.md  → なし（他ファイルがここを参照するだけ）
REQUIREMENTS_LOG.md → PROJECT_STATE.md
LEARNING_LOG.md   → なし（参照専用）
CONTEXT_BRIDGE.md → 全チームが参照（セッション開始時の状態把握）
MASTER_LESSONS.md   → 全チームが参照（参考教訓の提示）
OWNER_DEFAULTS.md   → 技術選定・kill判断・価格設定時に参照

▌プロジェクトフォルダ構成
プロジェクト開始時に秘書が以下のフォルダ構成を作成する。

PROJECT_ROOT/
 ├── 📄 .antigravityignore         ← 静的除外フィルター（原本から複製）
 ├── 📄 .geminiignore              ← 静的除外フィルター（原本から複製）
 ├── 📄 .aiexclude                 ← 静的除外フィルター（原本から複製）
 ├── 📄 AGENTS.md                  ← AI行動規範・トークン削減指示書（ルート直下）
 ├── 📁 scripts/                   ← 開発ユーティリティスクリプト
 │    └── 📄 skeletonizer.py       ← コードシグネチャ抽出スクリプト（Python）
 ├── 📁 DOCS/                      ← 必須mdファイル格納
 │    ├── README.md
 │    ├── PROJECT_STATE.md
 │    ├── SERVICE_ORG_CORE.md
 │    ├── SERVICE_ORG_PHASE.md
 │    ├── REQUIREMENTS_LOG.md
 │    ├── LEARNING_LOG.md
 │    ├── CONTEXT_BRIDGE.md
 │    ├── MASTER_LESSONS.md
 │    ├── OWNER_DEFAULTS.md   ← 原本からコピー（プロジェクト間で共通）
 │    ├── APP_SHARED_RULES.md ← AI共通行動指針（原本からコピー）
 │    ├── STARTUP_GUIDE.md    ← 起動・運用手順書
 │    └── UI_LIBRARY_GUIDE.md ← UIライブラリ共存・参照ガイドブック（原本からコピー）
 ├── 📁 BDR/                       ← 意思決定記録（Phase別）
 ├── 📁 src/                       ← コードファイル
 ├── 📁 demo/                      ← デモファイル・デモ結果
 └── 📁 ARCHIVE/                   ← アーカイブ済みファイル

▌新プロジェクト開始時のチェックリスト
【毎回持っていく（変えない）】
□ .antigravityignore   → そのままルートに配置（静的除外）
□ .geminiignore        → そのままルートに配置（静的除外）
□ .aiexclude           → そのままルートに配置（静的除外）
□ AGENTS.md            → そのままルートに配置（AI行動規範）
□ scripts/             → skeletonizer.py 込みでそのままフォルダごとルートに配置
□ README.md           → そのまま使う
□ SERVICE_ORG_CORE.md → そのまま使う
□ MASTER_LESSONS.md   → 蓄積した教訓ごと持っていく（リセット不要）
□ OWNER_DEFAULTS.md   → 原本から最新版をコピーして使う（リセット不要）
   ※ 原本を更新したら各プロジェクトの DOCS/OWNER_DEFAULTS.md にも反映すること
□ APP_SHARED_RULES.md → 原本から最新版をコピーして使う（リセット不要）
□ STARTUP_GUIDE.md   → そのまま使う
□ UI_LIBRARY_GUIDE.md → 原本から最新版をコピーして使う（リセット不要）

【リセットして新規作成する】
□ PROJECT_STATE.md    → 全項目リセット・新プロジェクト情報を記入
□ SERVICE_ORG_PHASE.md → 必要なチーム構成に書き換える
□ REQUIREMENTS_LOG.md → 新規作成
□ LEARNING_LOG.md     → 新規作成
□ CONTEXT_BRIDGE.md   → 新規作成（記録チームが自動作成・空欄投入でもOK）

【アーカイブする】
□ 前プロジェクトのBDR → ARCHIVE/[PJ名]_BDR/
□ 前プロジェクトのCONTEXT_BRIDGE.md → ARCHIVE/[PJ名]_CONTEXT/

▌秘書へのセッション開始指示
トリガー：新しいセッションが開始されたとき

> 【環境による使い分け】
> Claude Code（CLI・VSCode拡張）使用時：CLAUDE.md が自動読込されるため、この手順は不要。
> Antigravity・通常チャット使用時：この手順に従って手動でセッションを開始すること。

秘書（AIの役割のひとつ）は以下の順番で即座に実行する：

STEP 1｜README.mdを読む
STEP 2｜PROJECT_STATE.mdを読み、現在地と開発情報を把握する
STEP 3｜SERVICE_ORG_CORE.mdを読み、自走ルール・開発フローを確認する
STEP 4｜SERVICE_ORG_PHASE.mdを読み、現フェーズとチーム状況を確認する
STEP 5｜CONTEXT_BRIDGE.mdを読み、前回セッションの状態を引き継ぐ
        → 存在しない・空欄の場合：記録チームに新規作成を指示する
STEP 6｜OWNER_DEFAULTS.mdを読み、技術スタック・kill基準・収益化方針を確認する
STEP 7｜MASTER_LESSONS.mdを読み、関連教訓を抽出する（参考として提示）
        → 🟢フィードバックパターンのみ常時適用
STEP 8｜モードを判定してから以下を社長に報告する

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

README.md v1.0（アプリ特化版）— 🔒不変層。変更には社長承認必須。
