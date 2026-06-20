---
description: 現在の原本ディレクトリを元に新しいアプリプロジェクトを初期化する
---

以下の手順で新しいプロジェクトを準備してください。

## Step 1: プロジェクト名の確認
ユーザーに対して「新しいプロジェクトのフォルダ名（英数字推奨）は何にしますか？」と質問し、回答を待つ。

## Step 2: フォルダのコピーと初期化
回答を得たら、原本（現在のディレクトリ）の１つ上の階層にその名前でフォルダを作成し、原本の内容をコピーする。
ただし、`.git`、`node_modules`、`DOCS/SESSION_LOG.md` 等の固有履歴は除外するか、コピー後にリセットする。

以下のシェルスクリプトを実行してコピーを行う（[PROJECT_NAME] はユーザーから得た名前に置き換える）。
```bash
cd ..
mkdir [PROJECT_NAME]
cp -R アプリ作成原本/* [PROJECT_NAME]/
cp -R アプリ作成原本/.* [PROJECT_NAME]/ 2>/dev/null || true
cd [PROJECT_NAME]
rm -rf .git node_modules dist build
```

## Step 3: 初期設定
1. 必要な場合は `npm install` または `pip install` 等を実行し、依存関係をクリーンインストールする。
2. `DOCS/PROJECT_STATE.md` を初期化し、プロジェクト名と初期フェーズ（Phase 0）を設定する。
3. `git init` を行い、初期コミットを作成する。

## Step 4: 完了報告
新しいプロジェクトディレクトリの準備が完了したことをユーザーに報告し、該当ディレクトリに移動して作業を開始するよう促す。
