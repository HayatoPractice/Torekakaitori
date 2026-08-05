#!/usr/bin/env python3
"""
check_ecosystem_health.py — アプリ作成関連フォルダ全体の定期点検スクリプト

2026-08-01 に発覚した2つの事故を受けて新設：
  ① 古着ブランド・年代鑑定ツール で25件・数週間分の未コミット作業が誰にも
     気づかれず放置されていた（データ消失リスク）
  ② app-template2 / app-template3（バックアップ用クローン）が5週間 push のみで
     pull されておらず、原本の最新状態と乖離していた

【チェック内容】
  1. 各アプリフォルダの未コミット変更（git status --short の件数）
  2. バックアップ用クローン（app-template2/3等、originが原本と同じリポジトリ由来）の
     HEADが originのHEAD と一致しているか（--fetch 指定時のみ、ネットワークアクセスあり）
  3. アプリ作成原本フォルダ直下にアプリ固有ファイル（src/, package.json等）が
     混入していないか
  4. .claude/settings.local.json の許可ルールが、存在しないパスを参照していないか
     （デッドルールの検出のみ・自動削除はしない）

【使い方】
  python3 scripts/check_ecosystem_health.py            # ネットワークアクセスなし（高速）
  python3 scripts/check_ecosystem_health.py --fetch     # 各リポジトリを git fetch して比較（低速・要ネット）

【安全方針】
  読み取り専用。ファイルの変更・削除・commit・pushは一切行わない。
"""

import re
import subprocess
import sys
from pathlib import Path

ORIGIN = Path(__file__).resolve().parent.parent
APPS_DIR = ORIGIN.parent
EXCLUDE_DIRS = {".git", "node_modules", "__pycache__", ".DS_Store"}

FORBIDDEN_IN_ORIGIN = [
    "src", "supabase", "public", "package.json", "package-lock.json",
    "next.config.ts", "tsconfig.json", "eslint.config.mjs", "postcss.config.mjs",
    "dist", "node_modules", ".next",
]


def run(cmd, cwd=None, timeout=30):
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip()
    except Exception:
        return ""


def find_git_dirs():
    """アプリ作成/ 直下でgit管理されているフォルダ一覧（原本含む）"""
    dirs = [ORIGIN]
    for item in sorted(APPS_DIR.iterdir()):
        if not item.is_dir() or item.name in EXCLUDE_DIRS or item == ORIGIN:
            continue
        if (item / ".git").exists():
            dirs.append(item)
    return dirs


def check_uncommitted(dirs):
    print("── ① 未コミット変更チェック ──────────────────")
    any_found = False
    for d in dirs:
        status = run(["git", "status", "--short"], cwd=d)
        if status:
            any_found = True
            count = len(status.splitlines())
            print(f"  ⚠️ {d.name}: {count}件の未コミット変更あり")
        else:
            print(f"  ✅ {d.name}: クリーン")
    if not any_found:
        print("  → 全フォルダきれいです。")
    print()


def check_backup_drift(dirs, do_fetch):
    print("── ② バックアップクローンのHEADドリフト ──────────")
    if not do_fetch:
        print("  ⏭️  --fetch 未指定のためスキップ（ネットワークアクセスが必要）")
        print()
        return
    origin_head = run(["git", "rev-parse", "HEAD"], cwd=ORIGIN)
    for d in dirs:
        remote = run(["git", "remote"], cwd=d)
        if not remote:
            print(f"  ⏭️  {d.name}: remote未設定（スキップ）")
            continue
        run(["git", "fetch", "--quiet"], cwd=d, timeout=60)
        remote_head = run(["git", "rev-parse", "origin/main"], cwd=d)
        local_head = run(["git", "rev-parse", "HEAD"], cwd=d)
        if remote_head and local_head != remote_head:
            behind = run(["git", "rev-list", "--count", f"{local_head}..{remote_head}"], cwd=d)
            print(f"  ⚠️ {d.name}: ローカルがリモートより {behind} コミット遅れています（要 git pull）")
        elif remote_head:
            print(f"  ✅ {d.name}: リモートと一致")
    print()


def check_origin_contamination():
    print("── ③ 原本フォルダの混入チェック ──────────────")
    found = [name for name in FORBIDDEN_IN_ORIGIN if (ORIGIN / name).exists()]
    if found:
        print(f"  ⚠️ 原本直下にアプリ固有ファイルが見つかりました: {', '.join(found)}")
        print("     → 特定アプリの実装がここに紛れ込んでいないか確認してください。")
    else:
        print("  ✅ 混入なし（テンプレート専用状態）")
    print()


def check_dead_permission_rules(dirs):
    print("── ④ settings.local.json のデッドルール検出 ──────")
    path_pattern = re.compile(r"(/Users/[^\s\"')]+)")
    any_found = False
    for d in dirs:
        f = d / ".claude" / "settings.local.json"
        if not f.exists():
            continue
        try:
            text = f.read_text(encoding="utf-8")
        except Exception:
            continue
        dead = set()
        for m in path_pattern.finditer(text):
            p = Path(m.group(1))
            # ファイルパスらしきものだけ判定（拡張子 or 明らかなディレクトリ末尾）
            if not p.exists() and (p.suffix or p.name in {"scripts", "DOCS", ".claude"}):
                dead.add(str(p))
        if dead:
            any_found = True
            print(f"  ⚠️ {d.name}: 存在しないパスへの参照 {len(dead)}件")
            for p in sorted(dead)[:5]:
                print(f"       - {p}")
    if not any_found:
        print("  ✅ デッドルールなし（または検出対象パスなし）")
    print()


def main():
    do_fetch = "--fetch" in sys.argv
    dirs = find_git_dirs()

    print("=" * 56)
    print("  アプリ作成エコシステム 定期点検")
    print(f"  対象フォルダ数: {len(dirs)}（原本含む）")
    print("=" * 56)
    print()

    check_uncommitted(dirs)
    check_backup_drift(dirs, do_fetch)
    check_origin_contamination()
    check_dead_permission_rules(dirs)

    print("点検完了。")


if __name__ == "__main__":
    main()
