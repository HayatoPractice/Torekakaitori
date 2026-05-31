# AUTO_SYNC_GUIDE.md — 原本→全フォルダ自動同期 セットアップガイド

このガイドでは「原本フォルダを git pull したら全アプリ/全サイトフォルダへ自動反映される」仕組みの
技術解説と、別の原本フォルダ（例：ホームページ作成原本）に同じ仕組みを導入する手順を説明します。

---

## 1. 仕組みの概要【現行方式：Git post-merge フック】

```
GitHub にプッシュ（原本フォルダの変更）
        ↓
ローカルで git pull
        ↓（マージ完了後に自動実行）
.git/hooks/post-merge（Git フック）
        ↓（sync_to_apps.py を起動）
全アプリフォルダへ共有ファイルをコピー
        ↓
ログ（/tmp/appsync.log）に記録
```

### 旧方式（launchd）との比較

| 観点 | launchd 方式（旧） | post-merge フック（現行） |
|---|---|---|
| 実行タイミング | ファイル変更のたびに発火 | git pull 完了後のみ |
| 誤配布リスク | 作業中にも発火する可能性あり | なし |
| macOS専用か | はい | いいえ（クロスプラットフォーム） |
| 常駐プロセス | 常駐する | しない |
| 初回セットアップ | install コマンドが必要 | フックコピー1回のみ |

### 設定ファイルの場所

```
アプリ作成原本/
├── scripts/
│    ├── sync_to_apps.py        ← 同期ロジック本体
│    ├── post-merge             ← フックの実体（リポジトリで管理）
│    ├── install_hooks.sh       ← 初回1回だけ実行するセットアップ
│    └── setup_auto_sync.sh     ← 旧launchd方式の停止に使う（移行完了後は不要）
│
.git/hooks/
└── post-merge                  ← install_hooks.sh がここにコピーする
```

---

## 2. 同期の判断ロジック

### 同期する／しないの分類

| 分類 | ファイル例 | 扱い |
|---|---|---|
| **共有ファイル（常に同期）** | APP_SHARED_RULES.md, OWNER_DEFAULTS.md, STARTUP_GUIDE.md, SERVICE_ORG_CORE.md, AGENTS.md など | 原本から全フォルダへ上書きコピー |
| **プロジェクト固有（同期しない）** | PROJECT_STATE.md, CONTEXT_BRIDGE.md, REQUIREMENTS_LOG.md, LEARNING_LOG.md, SERVICE_ORG_PHASE.md | 各プロジェクトの独自データなので触らない |
| **CLAUDE.md（条件付き同期）** | CLAUDE.md | プロジェクト固有セクション（`## `レベル）がなければ同期・あれば保護 |

### 新規フォルダの自動検出ロジック

- 原本フォルダの**親ディレクトリ**にある全サブディレクトリを走査する
- `DOCS/` フォルダを持つディレクトリ = アプリ/サイトフォルダと判定
- 原本フォルダ自身とインシデント管理フォルダは除外
- → 新しいフォルダを作ってもコードの変更なしに自動検出される

---

## 3. 初回セットアップ手順

### STEP 1｜ローカルでフックを登録する（1回だけ）

```bash
# 原本フォルダのルートで実行
bash scripts/install_hooks.sh
```

成功すると以下が表示される：
```
✅ post-merge フックを登録しました
   次回から git pull するたびに全アプリへ自動同期されます
```

### STEP 2｜launchd 方式を使っていた場合は停止する

```bash
bash scripts/setup_auto_sync.sh uninstall
```

### STEP 3｜動作確認（初回のみ）

```bash
# dry-run で何が同期されるか確認
python3 scripts/sync_to_apps.py --dry-run

# 問題なければ git pull を実行（以降は自動）
git pull
# → 同期ログが表示されれば成功
```

### STEP 4｜新しいPCや環境でも同じ手順

`.git/hooks/` はリポジトリにコミットされないため、環境が変わるたびに STEP 1 だけ再実行する。
`scripts/post-merge`（実体）はリポジトリで管理されているので git pull すれば常に最新版が手に入る。

---

## 4. ホームページ作成原本への導入手順

### STEP 1｜sync スクリプトをコピーする

アプリ作成原本の `scripts/sync_to_apps.py` を
ホームページ作成原本の `scripts/sync_to_sites.py` としてコピーする。

```bash
cp /Users/sasakihayato/アプリ作成関連/アプリ作成/アプリ作成原本/scripts/sync_to_apps.py \
   /Users/sasakihayato/ホームページ作成/ホームページ作成原本/scripts/sync_to_sites.py
```

### STEP 2｜sync スクリプトをホームページ用に書き換える

`sync_to_sites.py` を開き、以下の箇所を書き換える：

```python
# ── 変更箇所 1：原本フォルダのパス ──
ORIGIN = Path("/Users/sasakihayato/ホームページ作成/ホームページ作成原本")
APPS_DIR = ORIGIN.parent  # /Users/sasakihayato/ホームページ作成/

# ── 変更箇所 2：除外フォルダ名 ──
EXCLUDE_DIRS = {"ホームページ作成原本"}  # ← 原本フォルダ名に変更

# ── 変更箇所 3：同期しないファイル（ホームページ版の固有ファイルに合わせる）──
SKIP_DOCS = {
    "PROJECT_STATE.md",
    "CONTEXT_BRIDGE.md",
    "LEARNING_LOG.md",
    # ← ホームページ版で固有データになるファイルを追加
}

# ── 変更箇所 4：CLAUDE.md の標準セクション名 ──
# ホームページ版CLAUDE.mdのセクション名に合わせて調整する
STANDARD_CLAUDE_SECTIONS = {
    "起動シーケンス",
    "基本行動原則",
    # ← ホームページ版の標準セクション名を記載する
}
```

### STEP 3｜install_hooks.sh をコピーして実行する

```bash
cp /Users/sasakihayato/アプリ作成関連/アプリ作成/アプリ作成原本/scripts/install_hooks.sh \
   /Users/sasakihayato/ホームページ作成/ホームページ作成原本/scripts/install_hooks.sh
```

`install_hooks.sh` の以下の箇所を書き換える（post-mergeの実体はアプリ版と同じものを使い回せます）：

```bash
# ── 変更箇所 ──
# SYNC_SCRIPTのパスだけホームページ用に書き換えるよう修正する
HOOK_SRC="$REPO_ROOT/scripts/post-merge" # post-mergeもホームページ版リポジトリにコピーしておく
```

### STEP 4｜動作テストをしてからフックを登録する

```bash
# まず手動でテスト実行（エラーがないか確認）
python3 /Users/sasakihayato/ホームページ作成/ホームページ作成原本/scripts/sync_to_sites.py

# 問題なければフックを登録
bash /Users/sasakihayato/ホームページ作成/ホームページ作成原本/scripts/install_hooks.sh
```

### STEP 5｜有効化を確認する

適当なファイルを変更して `git commit` し、`git pull` を実行して「✅ 同期完了」と出力されるか確認する。

---

## 5. 日常の操作

### ドライランモード（安全な事前確認）

大きな変更を加える前に「実際には何もコピーせず、何が同期されるかだけ確認する」モード。

```bash
python3 /Users/sasakihayato/アプリ作成関連/アプリ作成/アプリ作成原本/scripts/sync_to_apps.py --dry-run
```

出力例：
```
[2026-05-23 12:00:00] 【DRY-RUN】同期完了: 9アプリ
  [DRY-RUN] 更新: MASTER_LESSONS.md, OWNER_DEFAULTS.md — SNS運用
  スキップ: CLAUDE.md — 英会話（固有セクションあり）
  ※ --dry-run モード: 実際のコピーは行っていません
```

→ 内容を確認したうえで問題なければ `--dry-run` なしで本実行する。

### 差分ログ（何が更新されたか記録される）

通常実行でもログに「どのファイルが更新されたか」が記録される。

```bash
# ログを確認する
tail -20 /tmp/appsync.log
```

出力例（変更があった場合）：
```
2026-05-23 12:00:00 [2026-05-23 12:00:00] 同期完了: 9アプリ
2026-05-23 12:00:00   更新: MASTER_LESSONS.md — SNS運用
2026-05-23 12:00:00   更新: MASTER_LESSONS.md — 英会話
2026-05-23 12:00:00   スキップ: CLAUDE.md — 英会話（固有セクションあり）
```

内容が変わっていないファイルは「更新」に表示されない（差分のあるファイルのみ記録）。

### ログの確認

```bash
cat /tmp/appsync.log   # アプリ作成用
cat /tmp/sitesync.log  # ホームページ用（ログパスは setup スクリプトで変更可能）
```

### 今すぐ手動で全アプリへ同期したい

git pull を待たずに即時配布したい場合：

```bash
python3 scripts/sync_to_apps.py
```

### 自動同期を一時的に無効化したい

`.git/hooks/post-merge` を退避すれば停止、戻せば再開：

```bash
# 停止
mv .git/hooks/post-merge .git/hooks/post-merge.disabled

# 再開
mv .git/hooks/post-merge.disabled .git/hooks/post-merge
```

---

## 6. トラブルシューティング

### 「同期されていない気がする」

```bash
# ログで最後の同期時刻を確認
tail -5 /tmp/appsync.log
```

### 「git pull しても同期されない」

フックが登録されているか確認する：

```bash
ls -la .git/hooks/post-merge
# → ファイルがあり実行権限(x)がついていれば正常
# → ない場合は bash scripts/install_hooks.sh を再実行
```

### 「特定のファイルが同期されない」

`sync_to_apps.py` の `SKIP_DOCS` に追加されている可能性がある。
スクリプトを確認して削除すれば同期対象になる。

### macOS の Unicode 正規化について（技術メモ）

macOS のファイルシステム（HFS+/APFS）は日本語ファイル名を NFD 形式（分解形）で保存する。
Python の文字列は NFC 形式のため、そのまま比較すると「同じフォルダ名」が不一致になるバグが起きる。
sync_to_apps.py では `unicodedata.normalize("NFC", ...)` で正規化して比較することで解決している。
新しいスクリプトを書く際も日本語パス比較には同様の処理が必要。

---

AUTO_SYNC_GUIDE.md v2.0 — 2026-05-29 launchd方式 → Git post-mergeフック方式に移行
