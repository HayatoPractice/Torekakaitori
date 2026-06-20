#!/usr/bin/env python3
"""
update_minutes.py — post-commit フック: コミットの「次:」行を MINUTES.md へ自動転記

【動作】
  コミットメッセージの中で「次: 」から始まる行を探し、
  MINUTES.md の「| 次のタスク |」行を自動更新する。
  MINUTES.md が存在しない場合（アプリ作成原本など）は何もしない。

【使い方（コミットメッセージ例）】
  feat: ログイン機能を実装

  次: ユーザー登録フォームを実装する

【post-commit での呼び出し】
  python3 "$REPO_ROOT/scripts/update_minutes.py"
"""

import re
import subprocess
import sys
from pathlib import Path


NEXT_PATTERN = re.compile(r"^次[:：]\s*(.+)$", re.MULTILINE)
MINUTES_ROW = re.compile(r"(\|\s*次のタスク\s*\|\s*)(.+?)(\s*\|)\s*$", re.MULTILINE)


def get_repo_root() -> Path:
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True, text=True,
    )
    return Path(result.stdout.strip())


def get_commit_message() -> str:
    result = subprocess.run(
        ["git", "log", "-1", "--format=%B"],
        capture_output=True, text=True,
    )
    return result.stdout.strip()


def main() -> int:
    root = get_repo_root()
    minutes = root / "MINUTES.md"
    if not minutes.exists():
        return 0  # 原本フォルダ等は対象外（静かに終了）

    msg = get_commit_message()
    m = NEXT_PATTERN.search(msg)
    if not m:
        return 0  # 「次:」行なし → 何もしない

    next_task = m.group(1).strip()
    content = minutes.read_text(encoding="utf-8")

    new_content = MINUTES_ROW.sub(
        lambda r: f"{r.group(1)}{next_task}{r.group(3)}",
        content,
        count=1,
    )
    if new_content == content:
        return 0  # 変更なし

    minutes.write_text(new_content, encoding="utf-8")
    print(f"📝 MINUTES.md 次のタスク更新: {next_task}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
