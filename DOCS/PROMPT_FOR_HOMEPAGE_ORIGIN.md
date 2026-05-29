# PROMPT_FOR_HOMEPAGE_ORIGIN.md — ホームページ作成原本フォルダへの投入用プロンプト
# 用途：アプリ作成原本で実施した改良をホームページ作成原本に反映するための指示書
# 使い方：このファイルの内容をそのままClaude Codeに貼り付けて実行する

---

## 投入プロンプト本文

---

以下の作業を実施してください。
これはアプリ作成原本フォルダで行った改良と同じ内容を、このホームページ作成原本フォルダにも反映するものです。

---

### 【背景】アプリ作成原本で行った改良の概要

アプリ作成原本フォルダでは以下の3つの改良を実施しました。

**① 自動同期方式の変更（launchd → Git post-merge フック）**

旧方式（launchd）の問題点：
- macOS専用で他OSでは動作しない
- ファイルの変更を常時監視するため、作業中（AI編集中）にも発火してしまう
- 常駐プロセスが動き続ける

新方式（Git post-merge フック）の特徴：
- `git pull` 完了後にのみ自動実行される（誤配布リスクなし）
- クロスプラットフォーム（macOS・Linux・Windows対応）
- 常駐プロセス不要
- 初回1回だけ `bash scripts/install_hooks.sh` を実行すればよい

**② GitHub Actions 自動化ガイドの追加**

- Lint・型チェック・テスト・セキュリティスキャン・バージョン確認のYAML例をまとめたガイドを新規作成

**③ 不要ファイルの削除・2層構造の整備**

- 重複・廃止ファイルを整理し、DOCS_INDEX.md を中心とした2層読込構造を確立

---

### 【作業指示】

以下の順序で実施してください。

---

#### STEP 1｜既存の自動同期スクリプト確認

`scripts/` フォルダにある以下のファイルを確認してください：
- `sync_to_sites.py`（またはそれに相当する同期スクリプト）
- `setup_auto_sync.sh`（またはそれに相当するlaunchd設定スクリプト）
- 既に `post-merge` や `install_hooks.sh` が存在するかどうか

---

#### STEP 2｜post-merge フックの作成

`scripts/post-merge` を以下の内容で新規作成してください：

```bash
#!/bin/bash
# post-merge — git pull 完了後に自動実行される Git フック
#
# 【セットアップ】
#   初回1回だけ: bash scripts/install_hooks.sh
#
# 【動作】
#   git pull でマージが発生するたびに同期スクリプトを自動実行し
#   全サイトフォルダへ最新の共有ファイルを配布する

REPO_ROOT="$(git rev-parse --show-toplevel)"
# ↓ このフォルダの同期スクリプト名に合わせて変更すること
SYNC_SCRIPT="$REPO_ROOT/scripts/sync_to_sites.py"

echo "🔄 原本フォルダの変更を全サイトへ同期します..."
python3 "$SYNC_SCRIPT"
echo "✅ 同期完了（詳細: tail -20 /tmp/sitesync.log）"
```

※ `SYNC_SCRIPT` の行はこのフォルダの実際のスクリプト名に合わせてください。

---

#### STEP 3｜install_hooks.sh の作成

`scripts/install_hooks.sh` を以下の内容で新規作成してください：

```bash
#!/bin/bash
# install_hooks.sh — Git フックのローカル登録スクリプト
#
# 【使い方】初回1回だけ実行する
#   bash scripts/install_hooks.sh
#
# 【launchd 方式からの移行】
#   bash scripts/setup_auto_sync.sh uninstall

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_SRC="$REPO_ROOT/scripts/post-merge"
HOOK_DST="$REPO_ROOT/.git/hooks/post-merge"

if [ -f "$HOOK_DST" ]; then
  echo "⚠️  post-merge フックはすでに登録されています: $HOOK_DST"
  echo "   上書きしますか？ [y/N]"
  read -r answer
  if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
    echo "キャンセルしました"
    exit 0
  fi
fi

cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"

echo ""
echo "✅ post-merge フックを登録しました"
echo "   登録先: $HOOK_DST"
echo ""
echo "   次回から git pull するたびに全サイトへ自動同期されます"
echo ""
echo "【launchd 方式を使っていた場合は停止してください】"
echo "   bash scripts/setup_auto_sync.sh uninstall"
```

---

#### STEP 4｜AUTO_SYNC_GUIDE.md の更新

このフォルダに `DOCS/AUTO_SYNC_GUIDE.md` または相当するガイドがあれば、
以下の方針で更新してください：

1. **仕組みの概要** を launchd → Git post-merge フックに書き換える
2. **セットアップ手順** として以下を追加：
   - STEP 1: `bash scripts/install_hooks.sh`（初回1回のみ）
   - STEP 2: `bash scripts/setup_auto_sync.sh uninstall`（launchd停止）
   - STEP 3: `python3 scripts/sync_to_sites.py --dry-run` で動作確認
3. **一時停止方法** として以下を追加：
   ```bash
   # 停止
   mv .git/hooks/post-merge .git/hooks/post-merge.disabled
   # 再開
   mv .git/hooks/post-merge.disabled .git/hooks/post-merge
   ```
4. バージョンを v2.0 に更新

---

#### STEP 5｜GITHUB_ACTIONS_GUIDE.md の追加

アプリ作成原本の `DOCS/GITHUB_ACTIONS_GUIDE.md` をこのフォルダの `DOCS/` にコピーしてください。
内容はアプリ向けと同じで問題ありません（Lint・テスト・セキュリティの設定は共通です）。

アプリ作成原本のパス：
```
/Users/sasakihayato/アプリ作成関連/アプリ作成/アプリ作成原本/DOCS/GITHUB_ACTIONS_GUIDE.md
```

---

#### STEP 6｜DOCS_INDEX.md への登録

`DOCS/DOCS_INDEX.md` が存在する場合、以下の2ファイルを索引に追加してください：

| ファイル名 | 読込タイミング | 内容サマリー |
|---|---|---|
| GITHUB_ACTIONS_GUIDE.md | CI/CD設計時 / 新プロジェクト開始時 | Lint・テスト・セキュリティスキャン・バージョン確認のYAML例 |

---

#### STEP 7｜動作確認とコミット

以下の確認をしてからコミット・プッシュしてください：

```bash
# フックスクリプトに実行権限があるか確認
ls -la scripts/post-merge scripts/install_hooks.sh

# dry-run で同期内容を確認
python3 scripts/sync_to_sites.py --dry-run

# 問題なければコミット
git add -A
git commit -m "feat: replace launchd auto-sync with Git post-merge hook + add GITHUB_ACTIONS_GUIDE"
git push
```

---

### 【注意事項】

- `SYNC_SCRIPT` のパスは必ずこのフォルダの実際のスクリプト名に合わせること
- `sync_to_sites.py` が存在しない場合は先に確認して報告すること
- launchd を停止する前に dry-run で同期が正常に動くことを確認すること
- 既存ファイルの削除は行わないこと（追加・更新のみ）

---

PROMPT_FOR_HOMEPAGE_ORIGIN.md v1.0 — アプリ作成原本の改良をホームページ作成原本へ移植するための投入プロンプト
