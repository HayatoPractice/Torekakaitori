#!/usr/bin/env python3
"""
sync_to_apps.py — アプリ作成原本 → 全アプリフォルダへの自動同期スクリプト

【動作】
- アプリ作成原本の共有ファイルを、同階層にある全アプリフォルダへコピーする
- DOCSフォルダを持つサブディレクトリを自動検出（新規フォルダも自動対応）
- プロジェクト固有ファイル（PROJECT_STATE.md 等）は上書きしない
- CLAUDE.md はプロジェクト固有セクションが無いアプリのみ自動同期
- scripts/ フォルダ内の .py ファイルを全て同期（ハードコード不要・新規追加も自動対応）

【オプション】
- --dry-run : 実際にはコピーせず、何が同期されるかだけ表示する（確認用）

【自動起動方式】
- Git post-merge フック（.git/hooks/post-merge）で管理
- git pull でマージが発生するたびに自動実行
- セットアップ：bash scripts/install_hooks.sh（初回1回のみ）
- ログ: /tmp/appsync.log

【注意】
- 旧方式（launchd: ~/Library/LaunchAgents/com.hayato.appsync.plist）は廃止済み
- setup_auto_sync.sh も廃止済みのため削除済み
"""

import sys
import shutil
import logging
import unicodedata
import filecmp
from pathlib import Path
from datetime import datetime

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 設定
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ORIGIN = Path("/Users/sasakihayato/アプリ作成関連/アプリ作成/アプリ作成原本")
APPS_DIR = ORIGIN.parent  # /Users/sasakihayato/アプリ作成関連/アプリ作成/

# 同期しないフォルダ名（アプリ作成フォルダ直下にあるが除外するもの）
EXCLUDE_DIRS = {"アプリ作成原本", "インシデント管理"}

# DOCSフォルダ内で同期しないファイル（プロジェクト固有データ）
SKIP_DOCS = {
    "PROJECT_STATE.md",
    "REQUIREMENTS_LOG.md",
    "LEARNING_LOG.md",
    "SERVICE_ORG_PHASE.md",
}

# プロジェクトルートに置く固有ファイル（同期しない）
SKIP_ROOT = {
    "MINUTES.md",
    "MINUTES_ARCHIVE.md",
    "SESSION_LOG.md",       # 各プロジェクトの詳細作業ログ（追記専用・上書き禁止）
    "SESSION_LOG_ARCHIVE.md",
}

# CLAUDE.md の「標準セクション」（これ以外のセクションがあれば固有セクションありと判定）
# ⚠️ 重要：has_project_specific_claude() は「部分一致（any(std in section_name)）」で検索する。
# 例：「起動シーケンス（必須・スキップ禁止）」も「起動シーケンス」が含まれているため一致する。
# ただし CLAUDE.md のセクション名を大幅に変更した場合はここも合わせて更新すること。
# → APP_SHARED_RULES.md §8-3 参照
STANDARD_CLAUDE_SECTIONS = {
    "起動シーケンス",
    "基本行動原則",
    "プロジェクト管理",
    "起動報告フォーマット",
    "型安全スタック標準",
    "AI共通行動指針",
    "セッション終了プロトコル",
}

# .md ファイルのアプリ固有ゾーン保護マーカー
# このマーカー以降に書いた内容は同期時に上書きされない（§24参照）
APP_SPECIFIC_MARKER = "<!-- APP_SPECIFIC_START -->"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ロジック
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s)


def find_app_dirs(apps_dir: Path, origin: Path, exclude_dirs: set) -> list:
    """DOCSフォルダを持つ全アプリフォルダを再帰的に検索する。
    直下だけでなく「カテゴリ/アプリ名/」のような1段ネストにも対応。
    node_modules / .claude/worktrees などの内部フォルダは除外する。
    """
    # パスに含まれていたら除外するキーワード（node_modules 等）
    EXCLUDE_PATH_KEYWORDS = {"node_modules", ".claude"}

    found = []
    for docs_path in sorted(apps_dir.rglob("DOCS")):
        if not docs_path.is_dir():
            continue
        app_dir = docs_path.parent
        # 原本フォルダ自体は除外
        if nfc(str(app_dir.resolve())) == nfc(str(origin.resolve())):
            continue
        # パスのいずれかの階層が EXCLUDE_DIRS に一致するフォルダは除外
        parts = [unicodedata.normalize("NFC", p) for p in app_dir.parts]
        if any(unicodedata.normalize("NFC", ex) in parts for ex in exclude_dirs):
            continue
        # node_modules / .claude 等の内部フォルダは除外
        if any(kw in parts for kw in EXCLUDE_PATH_KEYWORDS):
            continue
        found.append(app_dir)
    return found


def has_project_specific_claude(claude_path: Path) -> bool:
    """CLAUDE.md にプロジェクト固有セクション（## レベル）が含まれるか判定する。"""
    if not claude_path.exists():
        return False
    for line in claude_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            section_name = line[3:].strip()
            if not any(std in section_name for std in STANDARD_CLAUDE_SECTIONS):
                return True
    return False


def is_changed(src: Path, dst: Path) -> bool:
    """コピー元とコピー先の内容が異なるか確認する。"""
    if not dst.exists():
        return True
    return not filecmp.cmp(str(src), str(dst), shallow=False)


def smart_copy_md(src: Path, dst: Path, label: str, result: dict, dry_run: bool):
    """APP_SPECIFIC_MARKER 以降のアプリ固有コンテンツを保護しながら .md ファイルをコピーする。

    動作：
    - src（原本）にマーカーがある場合：
        - dst にマーカーあり → src のマーカー前 + マーカー + dst のマーカー後（アプリ固有部）を結合
        - dst にマーカーなし → src の全内容をコピー（初回）
    - src にマーカーがない場合 → 通常コピー（後方互換）
    """
    src_content = src.read_text(encoding="utf-8")

    if not dst.exists():
        if not dry_run:
            dst.parent.mkdir(exist_ok=True)
            dst.write_text(src_content, encoding="utf-8")
        result["updated"].append(label)
        return

    dst_content = dst.read_text(encoding="utf-8")

    if APP_SPECIFIC_MARKER in src_content:
        src_shared, _, _ = src_content.partition(APP_SPECIFIC_MARKER)
        if APP_SPECIFIC_MARKER in dst_content:
            _, _, dst_app_specific = dst_content.partition(APP_SPECIFIC_MARKER)
            merged = src_shared + APP_SPECIFIC_MARKER + dst_app_specific
        else:
            merged = src_content  # dst にまだマーカーなし → 全体をコピー（マーカーを初期配布）
    else:
        merged = src_content  # src にマーカーなし → 通常コピー

    if merged == dst_content:
        result["unchanged"].append(label)
        return

    if not dry_run:
        dst.write_text(merged, encoding="utf-8")
    result["updated"].append(label)


def sync_app(app_dir: Path, dry_run: bool) -> dict:
    """1つのアプリフォルダに対して同期を実行する。"""
    result = {
        "updated": [],   # 実際に更新したファイル名
        "unchanged": [], # 内容が同じでスキップしたファイル名
        "skipped_claude": False,
        "claude_reason": "",
    }
    docs_dst = app_dir / "DOCS"
    if not dry_run:
        docs_dst.mkdir(exist_ok=True)

    def copy_file(src: Path, dst: Path, label: str):
        if is_changed(src, dst):
            if not dry_run:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
            result["updated"].append(label)
        else:
            result["unchanged"].append(label)

    # DOCSフォルダ内の共有ファイルを同期
    # .md ファイルは APP_SPECIFIC_MARKER 以降のアプリ固有コンテンツを保護する（§24参照）
    docs_src = ORIGIN / "DOCS"
    for src_file in sorted(docs_src.glob("*.md")):
        if src_file.name in SKIP_DOCS:
            continue
        smart_copy_md(src_file, docs_dst / src_file.name, src_file.name, result, dry_run)

    # ルートの共有ファイルを同期
    for fname in ["AGENTS.md", "GEMINI.md", ".antigravityignore", ".geminiignore", ".aiexclude"]:
        src = ORIGIN / fname
        if src.exists():
            copy_file(src, app_dir / fname, fname)

    # scripts/ フォルダ内の全 .py ファイルを同期（ループ方式・新規追加スクリプトも自動対応）
    # ⚠️ 同期しないスクリプトを除外したい場合は SKIP_SCRIPTS セットを追加すること
    scripts_src = ORIGIN / "scripts"
    for src_py in sorted(scripts_src.glob("*.py")):
        copy_file(src_py, app_dir / "scripts" / src_py.name, f"scripts/{src_py.name}")

    # scripts/hooks/ フォルダの .py ファイルを同期（フック機構を全アプリへ配布）
    hooks_src = scripts_src / "hooks"
    if hooks_src.exists():
        for src_py in sorted(hooks_src.glob("*.py")):
            copy_file(src_py, app_dir / "scripts" / "hooks" / src_py.name, f"scripts/hooks/{src_py.name}")

    # library_config.json を同期（ライブラリ選定ガイド・UIイメージキーワード対応表）
    lib_config_src = scripts_src / "library_config.json"
    if lib_config_src.exists():
        copy_file(lib_config_src, app_dir / "scripts" / "library_config.json", "scripts/library_config.json")

    # tsconfig.json を同期：⚠️ 既存ファイルは上書きしない（初回配布のみ）。
    # 理由：Next.js等のアプリは baseUrl / paths(@/*) / next プラグイン等の固有設定が必須であり、
    #       共通テンプレート(tsconfig.app.json)で上書きすると @/ インポートが全て解決不能になり
    #       ビルド不可になる（2026-06-21 古着ブランド・年代鑑定ツールで実害発生）。
    #       既存の tsconfig.json は各アプリの正本として尊重し、存在しない場合のみ雛形を配布する。
    tsconfig_src = ORIGIN / "tsconfig.app.json"
    tsconfig_dst = app_dir / "tsconfig.json"
    if tsconfig_src.exists() and not tsconfig_dst.exists():
        if not dry_run:
            tsconfig_dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(tsconfig_src, tsconfig_dst)
        result["updated"].append("tsconfig.json (初回配布)")

    # .vscode/ の共有設定ファイルを同期（IDE自動型チェック・タスク設定）
    for vscode_fname in ["tasks.json", "settings.json"]:
        src = ORIGIN / ".vscode" / vscode_fname
        if src.exists():
            copy_file(src, app_dir / ".vscode" / vscode_fname, f".vscode/{vscode_fname}")

    # .claude/commands/ フォルダのスラッシュコマンドを同期（§26 コマンド優先化ルール）
    # ホームページ作成フォルダは対象外（sync_to_apps.py は アプリ作成関連/ 以下のみスキャン）
    commands_src = ORIGIN / ".claude" / "commands"
    if commands_src.exists():
        for src_cmd in sorted(commands_src.glob("*.md")):
            copy_file(src_cmd, app_dir / ".claude" / "commands" / src_cmd.name, f".claude/commands/{src_cmd.name}")

    # .claude/settings.json を同期（ポータブルなフック設定・全アプリに配布）
    settings_src = ORIGIN / ".claude" / "settings.json"
    if settings_src.exists():
        copy_file(settings_src, app_dir / ".claude" / "settings.json", ".claude/settings.json")

    # CLAUDE.md: プロジェクト固有セクションがなければ同期
    claude_src = ORIGIN / "CLAUDE.md"
    claude_dst = app_dir / "CLAUDE.md"
    if claude_src.exists():
        if has_project_specific_claude(claude_dst):
            result["skipped_claude"] = True
            result["claude_reason"] = "固有セクションあり"
        else:
            copy_file(claude_src, claude_dst, "CLAUDE.md")

    return result


def format_log(app_name: str, result: dict, dry_run: bool) -> list[str]:
    """1アプリ分のログ行を生成する。"""
    lines = []
    prefix = "[DRY-RUN] " if dry_run else ""

    if result["updated"]:
        lines.append(f"  {prefix}更新: {', '.join(result['updated'])} — {app_name}")
    if result["skipped_claude"]:
        lines.append(f"  スキップ: CLAUDE.md — {app_name}（{result['claude_reason']}）")

    return lines


def main():
    dry_run = "--dry-run" in sys.argv

    # ログ設定（ファイル + コンソール同時出力）
    log_path = Path("/tmp/appsync.log")
    logger = logging.getLogger("appsync")
    logger.setLevel(logging.INFO)
    # ファイルハンドラ
    fh = logging.FileHandler(str(log_path))
    fh.setFormatter(logging.Formatter("%(asctime)s %(message)s", datefmt="%Y-%m-%d %H:%M:%S"))
    logger.addHandler(fh)
    # コンソールハンドラ
    ch = logging.StreamHandler()
    ch.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(ch)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    mode_label = "【DRY-RUN】" if dry_run else ""

    synced_apps = []
    all_log_lines = []

    for app_dir in find_app_dirs(APPS_DIR, ORIGIN, EXCLUDE_DIRS):
        result = sync_app(app_dir, dry_run)
        # 表示名は APPS_DIR からの相対パス（ネスト時も識別しやすい）
        rel_name = str(app_dir.relative_to(APPS_DIR))
        synced_apps.append(rel_name)
        all_log_lines.extend(format_log(rel_name, result, dry_run))

    # サマリー行
    summary = f"[{timestamp}] {mode_label}同期完了: {len(synced_apps)}アプリ"
    logger.info(summary)
    for line in all_log_lines:
        logger.info(line)

    if dry_run:
        logger.info("  ※ --dry-run モード: 実際のコピーは行っていません")


if __name__ == "__main__":
    main()
