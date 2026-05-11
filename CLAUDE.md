# CLAUDE.md — アプリ開発プロジェクト自動起動ファイル（APP版）
# このファイルはプロジェクトフォルダの一番上に置く。
# Claude Code・VSCode・Cursorが起動時に自動で読み込む。

---

## 起動時に必ず実行すること（スキップ禁止）

セッションが開始されたら以下の順番でDOCSフォルダのファイルを全て読み込む。

読み込む順番：
1. DOCS/README.md
2. DOCS/STARTUP_GUIDE.md
3. DOCS/CONTEXT_BRIDGE.md
4. DOCS/MASTER_LESSONS.md
5. DOCS/PROJECT_STATE.md
6. DOCS/SERVICE_ORG_CORE.md
7. DOCS/SERVICE_ORG_PHASE.md
8. DOCS/REQUIREMENTS_LOG.md
9. DOCS/LEARNING_LOG.md
10. DOCS/OWNER_DEFAULTS.md

読み込み完了後、以下を実行する：
- CONTEXT_BRIDGE.md の内容から過去の進捗・履歴を把握する
- MASTER_LESSONS.md の内容から過去のミス・教訓を把握する
- STARTUP_GUIDE.md の「現在地」セクションを確認する

---

## 新規プロジェクトか継続かの自動判断

PROJECT_STATE.md を読んだ後、以下で判断する。

### 新規プロジェクトと判断する条件
- PROJECT_STATE.md の app_name が空欄または「未設定」
- CONTEXT_BRIDGE.md の「前回の最終タスク」が空欄または「未設定」

新規と判断した場合：
1. ユーザーに確認する
   「新しいプロジェクトとして始めますか？
    以下のファイルをリセットして新規作成します：
    ・PROJECT_STATE.md
    ・REQUIREMENTS_LOG.md
    ・LEARNING_LOG.md
    ・SERVICE_ORG_PHASE.md
    よろしいですか？（はい / いいえ）」
2. 「はい」→ 上記4ファイルをリセットしてSERVICE_ORG_CORE.mdの
   新規作成モードのヒアリングフローを開始する
3. 「いいえ」→ そのままの状態で続きから再開する

### 継続プロジェクトと判断する条件
- PROJECT_STATE.md に app_name が記入されている
- CONTEXT_BRIDGE.md に前回の作業内容が記録されている

継続と判断した場合：
- STARTUP_GUIDE.md のセッション再開チェックリストに従って報告する
- 前回の続きから作業を再開する

---

## 持ち越すファイル（リセット禁止）

以下のファイルは新規プロジェクトでも削除・リセットしない。
過去の履歴・教訓として必ず参照する。

- CONTEXT_BRIDGE.md → 過去のAIとのやり取り・進捗履歴
- MASTER_LESSONS.md → 過去のミスの内容・原因・対処法・教訓

---

## このプロジェクトの種別

種別：アプリ開発（APP版）
使用ファイル：DOCS/フォルダ内のAPP特化版10ファイル
対応モード：新規作成 / 途中再開

---

## MASTER_LESSONS.md 管理ルール（原本はマスターソース）

このフォルダの DOCS/MASTER_LESSONS.md は全アプリ共有のマスターファイルです。

### このファイルの役割
- 全アプリがこの原本/DOCS/MASTER_LESSONS.md を参照・更新する
- このファイルが常に最新の状態を保つ必要がある

### MLエントリ追記時の必須手順
DOCS/MASTER_LESSONS.md に ML-XXX を追記したら、このファイル自体が正規版なので
他アプリへの通知は不要。ただし内容が正確で抜け漏れがないことを確認する。

---

## 起動報告フォーマット

読み込み完了後、以下のフォーマットで報告する。

【起動報告】秘書（アプリ開発モード）

プロジェクト名：[app_name / 新規]
現在のフェーズ：[Phase N / 未開始]
前回の最終タスク：[CONTEXT_BRIDGEより / なし]
実装ループ現在地：[設計/実装/検証/デモ待ち / 未開始]
過去のミス件数：[MASTER_LESSSONSのML件数]件（参考として把握済み）
次にやること：[具体的なタスク / ヒアリングから開始]
確認事項：[あれば / なければ「なし」]

続きから進めます。ご指示をお待ちしています。
