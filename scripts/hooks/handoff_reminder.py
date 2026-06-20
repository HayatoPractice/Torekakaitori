#!/usr/bin/env python3
"""
handoff_reminder.py — Stop フック（作業完了時の「続き」記録リマインド）APP版

【目的】
  Claude が応答を終えるたびに発火し、未記録の作業があれば
  「続き」を記録するファイルの更新を促す（誰がいつ見ても続きが分かる状態を保つため）。

【設計方針】
  - 非ブロッキング：終了を妨げない。あくまで「気づき」を出すだけ。
  - 条件付き：作業（git変更）が無いターンや、既に続きファイルを更新済みのときは
    何も出さない（ノイズ・無限ループ防止）。
  - フォルダ自動判定：
      プロジェクトフォルダ（TODO/手順書.md あり）→ 手順書.md を促す
      原本フォルダ等（手順書なし）             → MINUTES.md を促す
"""

import sys
import json
import subprocess
from pathlib import Path


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        data = {}

    # 無限ループ防止：Stop フックが既に作動中なら何もしない
    if data.get("stop_hook_active"):
        return

    try:
        root = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True,
        ).stdout.strip()
        if not root:
            return
        root = Path(root)
        status = subprocess.run(
            ["git", "-C", str(root), "status", "--porcelain"],
            capture_output=True, text=True,
        ).stdout.strip()
    except Exception:
        return

    if not status:
        return  # 変更なし → 何も促さない

    changed = [line[3:].strip().strip('"') for line in status.splitlines()]

    tejun = root / "TODO" / "手順書.md"
    if tejun.exists():
        # プロジェクトフォルダ：続きは TODO/手順書.md
        if any("手順書.md" in c for c in changed):
            return  # 既に更新済み → 促さない
        target = "TODO/手順書.md の『🔖 いまの続き』"
    else:
        # 原本フォルダ等：続きは MINUTES.md
        if any("MINUTES.md" in c for c in changed):
            return  # 既に更新済み → 促さない
        target = "MINUTES.md の TL;DR テーブル（次のタスク・状態を最新化）"

    print(
        f"\n📝 [引き継ぎリマインド] 未記録の作業があります。"
        f"作業が一区切りなら {target} を更新し、"
        f"「次にやること」を1行残してください"
        f"（次回セッションで SessionStart フックが自動表示します）。\n"
    )


if __name__ == "__main__":
    main()
