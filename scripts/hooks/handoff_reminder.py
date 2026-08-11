#!/usr/bin/env python3
"""
handoff_reminder.py — Stop フック（作業完了時の「続き」記録リマインド）APP版

【目的】
  Claude が応答を終えるたびに発火し、未記録の作業があれば
  「続き」を記録するファイルの更新を促す（誰がいつ見ても続きが分かる状態を保つため）。
  あわせて、バグ修正・事故対応系のコミットをしたのにインシデント記録が無い場合も促す
  （2026-08-01、CLAUDE.mdへの誤配布事故・MINUTES.md上書き事故が「記録して」という
  指示なしには記録されなかったことを受けて追加。INC-014, INC-015 参照）。

【設計方針】
  - 非ブロッキング：終了を妨げない。あくまで「気づき」を出すだけ。
  - 条件付き：作業（git変更）が無いターンや、既に続きファイルを更新済みのときは
    何も出さない（ノイズ・無限ループ防止）。
  - フォルダ自動判定：
      プロジェクトフォルダ（TODO/手順書.md あり）→ 手順書.md を促す
      原本フォルダ等（手順書なし）             → MINUTES.md を促す
  - インシデント記録チェックは「直近15分以内のコミット」かつ「バグ修正系のキーワードを
    含む」場合のみ発火し、インシデント管理フォルダに直近1時間以内に触られたファイルが
    あれば「記録済み」とみなして黙る（同じコミットについて延々と促し続けない）。
"""

import sys
import json
import subprocess
import time
from pathlib import Path

INCIDENT_DIR = Path("/Users/sasakihayato/アプリ作成関連/アプリ作成/インシデント管理")
INCIDENT_KEYWORDS = ["fix:", "バグ", "事故", "誤", "復旧", "revert"]
RECENT_COMMIT_WINDOW_SEC = 15 * 60
RECENT_INCIDENT_WINDOW_SEC = 60 * 60


def run(cmd, cwd=None):
    try:
        return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=15).stdout.strip()
    except Exception:
        return ""


def check_continuity_reminder(root, status):
    if not status:
        return None  # 変更なし → 何も促さない

    changed = [line[3:].strip().strip('"') for line in status.splitlines()]

    tejun = root / "TODO" / "手順書.md"
    if tejun.exists():
        # プロジェクトフォルダ：続きは TODO/手順書.md
        if any("手順書.md" in c for c in changed):
            return None  # 既に更新済み → 促さない
        target = "TODO/手順書.md の『🔖 いまの続き』"
    else:
        # 原本フォルダ等：続きは MINUTES.md
        if any("MINUTES.md" in c for c in changed):
            return None  # 既に更新済み → 促さない
        target = "MINUTES.md の TL;DR テーブル（次のタスク・状態を最新化）"

    return (
        f"\n📝 [引き継ぎリマインド] 未記録の作業があります。"
        f"作業が一区切りなら {target} を更新し、"
        f"「次にやること」を1行残してください"
        f"（次回セッションで SessionStart フックが自動表示します）。\n"
    )


def check_incident_reminder(root):
    commit_ts = run(["git", "-C", str(root), "log", "-1", "--format=%ct"])
    commit_msg = run(["git", "-C", str(root), "log", "-1", "--format=%s"])
    if not commit_ts or not commit_msg:
        return None

    try:
        commit_epoch = int(commit_ts)
    except ValueError:
        return None

    now = time.time()
    if now - commit_epoch > RECENT_COMMIT_WINDOW_SEC:
        return None  # 直近のコミットでなければ対象外（延々と促さないため）

    if not any(kw.lower() in commit_msg.lower() for kw in INCIDENT_KEYWORDS):
        return None  # バグ修正・事故対応系のコミットでなければ対象外

    if not INCIDENT_DIR.exists():
        return None

    try:
        recently_recorded = any(
            f.stat().st_mtime > commit_epoch - RECENT_INCIDENT_WINDOW_SEC
            for f in INCIDENT_DIR.glob("2*.md")
        )
    except Exception:
        return None

    if recently_recorded:
        return None  # 既に記録済みとみなす

    return (
        "\n⚠️ [インシデント記録リマインド] 直近のコミット「"
        f"{commit_msg}"
        "」はバグ修正・事故対応系に見えますが、"
        "インシデント管理フォルダへの記録が見当たりません。"
        "再発防止のため、同じ問題を繰り返さない学びであれば "
        "`インシデント管理/_TEMPLATE.md` を使って記録してください"
        "（`INCIDENT_INDEX.md` の一覧・タグ表・カテゴリ統計も忘れずに更新）。\n"
    )


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        data = {}

    # 無限ループ防止：Stop フックが既に作動中なら何もしない
    if data.get("stop_hook_active"):
        return

    root = run(["git", "rev-parse", "--show-toplevel"])
    if not root:
        return
    root = Path(root)
    status = run(["git", "-C", str(root), "status", "--porcelain"])

    messages = []
    m1 = check_continuity_reminder(root, status)
    if m1:
        messages.append(m1)
    m2 = check_incident_reminder(root)
    if m2:
        messages.append(m2)

    if messages:
        print("\n".join(messages))


if __name__ == "__main__":
    main()
