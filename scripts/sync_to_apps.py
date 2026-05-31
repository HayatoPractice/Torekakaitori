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
- setup_auto_sync.sh も廃止済み。参照のみ可・実行しないこと
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
    "CONTEXT_BRIDGE.md",
    "SERVICE_ORG_PHASE.md",
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
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ロジック
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s)


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
                dst.parent.mkdir(exist_ok=True)
                shutil.copy2(src, dst)
            result["updated"].append(label)
        else:
            result["unchanged"].append(label)

    # DOCSフォルダ内の共有ファイルを同期
    docs_src = ORIGIN / "DOCS"
    for src_file in sorted(docs_src.glob("*.md")):
        if src_file.name in SKIP_DOCS:
            continue
        copy_file(src_file, docs_dst / src_file.name, src_file.name)

    # ルートの共有ファイルを同期
    for fname in ["AGENTS.md", ".antigravityignore", ".geminiignore", ".aiexclude"]:
        src = ORIGIN / fname
        if src.exists():
            copy_file(src, app_dir / fname, fname)

    # scripts/ フォルダ内の全 .py ファイルを同期（ループ方式・新規追加スクリプトも自動対応）
    # ⚠️ 同期しないスクリプトを除外したい場合は SKIP_SCRIPTS セットを追加すること
    scripts_src = ORIGIN / "scripts"
    for src_py in sorted(scripts_src.glob("*.py")):
        copy_file(src_py, app_dir / "scripts" / src_py.name, f"scripts/{src_py.name}")

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

    for app_dir in sorted(APPS_DIR.iterdir()):
        if not app_dir.is_dir():
            continue
        # アプリ作成原本自身はスキップ（macOS Unicode NFD/NFC 差異に対応）
        if nfc(str(app_dir.resolve())) == nfc(str(ORIGIN.resolve())):
            continue
        # 除外フォルダはスキップ
        if any(nfc(excl) == nfc(app_dir.name) for excl in EXCLUDE_DIRS):
            continue
        # DOCSフォルダがない = アプリフォルダではない
        if not (app_dir / "DOCS").exists():
            continue

        result = sync_app(app_dir, dry_run)
        synced_apps.append(app_dir.name)
        all_log_lines.extend(format_log(app_dir.name, result, dry_run))

    # サマリー行
    summary = f"[{timestamp}] {mode_label}同期完了: {len(synced_apps)}アプリ"
    logger.info(summary)
    for line in all_log_lines:
        logger.info(line)

    if dry_run:
        logger.info("  ※ --dry-run モード: 実際のコピーは行っていません")


if __name__ == "__main__":
    main()
