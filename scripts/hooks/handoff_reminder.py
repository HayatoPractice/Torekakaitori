#!/usr/bin/env python3
"""
handoff_reminder.py — Stop フック（作業完了時の「続き」記録リマインド）APP版

【目的】
  Claude が応答を終えるたびに発火し、未記録の作業があれば
  「続き」を記録するファイルの更新を促す（誰がいつ見ても続きが分かる状態を保つため）。
  あわせて、バグ修正・事故対応系のコミットをしたのにインシデント記録が無い場合、
  **Stopをブロックして実際に書かせる**（2026-08-01、CLAUDE.mdへの誤配布事故・
  MINUTES.md上書き事故が「記録して」という指示なしには記録されなかった実績を受けて、
  「印字して促すだけ」では実行漏れが起きると判断し強制力を持たせた。INC-014, INC-015 参照）。

【設計方針】
  - 引き継ぎリマインド（続きファイル）は非ブロッキング：印字するだけで終了を妨げない。
  - インシデント記録リマインドは、**同一コミットにつき1回だけ**Stopをブロックして
    Claudeに続行させる（Claude Code公式仕様：exit 0 + JSON `{"decision":"block","reason":...}`）。
    2回目以降（Claudeが対応しても再度Stopが来た場合等）は無限ループを避けるため
    非ブロッキングの印字のみに切り替える（状態は
    ~/.origin_watch/incident_hook_last_blocked_commit.txt に「最後にブロックしたコミットhash」
    として保存・中立地帯のためgit非追跡）。
  - ブロック時の reason には「本当に記録すべきインシデントか判断してから、該当すれば記録する。
    軽微な修正なら記録不要と一言添えて続行してよい」という判断の余地を必ず含める
    （キーワード一致だけの粗い判定なので、些末な修正まで強制記録させないため）。
  - フォルダ自動判定：
      プロジェクトフォルダ（TODO/手順書.md あり）→ 手順書.md を促す
      原本フォルダ等（手順書なし）             → MINUTES.md を促す
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
BLOCKED_COMMIT_STATE = Path("/Users/sasakihayato/.origin_watch/incident_hook_last_blocked_commit.txt")


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
        f"📝 [引き継ぎリマインド] 未記録の作業があります。"
        f"作業が一区切りなら {target} を更新し、"
        f"「次にやること」を1行残してください"
        f"（次回セッションで SessionStart フックが自動表示します）。"
    )


def check_incident_reminder(root):
    """バグ修正・事故対応系コミットで未記録なら (message, commit_hash) を返す。対象外なら None。"""
    commit_hash = run(["git", "-C", str(root), "log", "-1", "--format=%H"])
    commit_ts = run(["git", "-C", str(root), "log", "-1", "--format=%ct"])
    commit_msg = run(["git", "-C", str(root), "log", "-1", "--format=%s"])
    if not commit_hash or not commit_ts or not commit_msg:
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

    message = (
        f"直近のコミット「{commit_msg}」はバグ修正・事故対応系に見えますが、"
        "インシデント管理フォルダ（/Users/sasakihayato/アプリ作成関連/アプリ作成/インシデント管理/）"
        "への記録が見当たりません。\n"
        "まず「これは今後も繰り返しうる学びか（＝記録する価値があるか）」を判断してください。\n"
        "・記録すべきと判断した場合：`_TEMPLATE.md` を使って新規ファイルを作成し、"
        "`INCIDENT_INDEX.md`（一覧・タグ表・カテゴリ統計）と `_PRE_CHECKLIST.md` も更新してから完了報告する。\n"
        "・軽微な修正で記録不要と判断した場合：その理由を一言添えて、記録せずに完了報告してよい。"
    )
    return message, commit_hash


def read_last_blocked_commit():
    try:
        return BLOCKED_COMMIT_STATE.read_text(encoding="utf-8").strip()
    except Exception:
        return None


def mark_blocked_commit(commit_hash):
    try:
        BLOCKED_COMMIT_STATE.parent.mkdir(parents=True, exist_ok=True)
        BLOCKED_COMMIT_STATE.write_text(commit_hash, encoding="utf-8")
    except Exception:
        pass


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

    continuity_msg = check_continuity_reminder(root, status)
    incident_result = check_incident_reminder(root)

    if incident_result:
        incident_msg, commit_hash = incident_result
        if read_last_blocked_commit() != commit_hash:
            # このコミットについてはまだブロックしていない → ブロックして実際に対応させる
            mark_blocked_commit(commit_hash)
            reason = incident_msg
            if continuity_msg:
                reason = continuity_msg + "\n\n" + reason
            print(json.dumps({"decision": "block", "reason": reason}, ensure_ascii=False))
            return
        else:
            # 既に一度ブロック済み（無限ループ防止） → 非ブロッキングの印字のみに切り替える
            plain = [f"⚠️ [インシデント記録リマインド・再掲] {incident_msg}"]
            if continuity_msg:
                plain.insert(0, continuity_msg)
            print("\n\n".join(plain))
            return

    if continuity_msg:
        print(continuity_msg)


if __name__ == "__main__":
    main()
