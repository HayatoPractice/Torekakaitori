#!/usr/bin/env python3
"""
session_start.py — SessionStart フック（セッション開始時の「続き」自動表示）APP版

【出力内容】
  1. MINUTES.md の TL;DR テーブル（前回の状態を5秒で把握）
  2. git status --short（作業フォルダの変更状況）
  3. compare_origins.py の結果（スクリプトがある場合のみ・要約）

【安全方針】
  例外が出ても黙って終了し、セッション開始を妨げない。
"""

import sys
import json
import subprocess
from pathlib import Path


def run(cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=20).stdout.strip()
    except Exception:
        return ""


def main():
    try:
        json.load(sys.stdin)
    except Exception:
        pass

    root = run(["git", "rev-parse", "--show-toplevel"])
    if not root:
        return
    root = Path(root)

    lines = ["\n╔══ [SessionStart] 前回の続き（自動表示）══╗"]

    # 1) MINUTES.md TL;DR
    minutes = root / "MINUTES.md"
    if minutes.exists():
        try:
            txt = minutes.read_text(encoding="utf-8")
            start = txt.find("TL;DR")
            if start != -1:
                end = txt.find("\n---", start)
                end2 = txt.find("\n## ", start + 10)
                if end == -1 and end2 == -1:
                    block = txt[start:start + 800]
                elif end == -1:
                    block = txt[start:end2]
                elif end2 == -1:
                    block = txt[start:end]
                else:
                    block = txt[start:min(end, end2)]
                lines.append("【MINUTES.md｜TL;DR】\n" + block.strip())
            else:
                lines.append("【MINUTES.md】(TL;DR セクションが見つかりません)")
        except Exception:
            pass
    else:
        # 原本フォルダ等（MINUTES.md なし）→ SESSION_LOG.md 末尾
        log = root / "SESSION_LOG.md"
        if log.exists():
            try:
                tail = "\n".join(log.read_text(encoding="utf-8").splitlines()[-15:])
                lines.append("【SESSION_LOG.md｜末尾】\n" + tail)
            except Exception:
                pass

    # 2) git status --short
    status = run(["git", "-C", str(root), "status", "--short"])
    lines.append("【git status】\n" + (status if status else "（変更なし）"))

    # 3) compare_origins.py（存在する場合のみ・先頭12行だけ表示）
    compare = root / "scripts" / "compare_origins.py"
    if compare.exists():
        out = run(["python3", str(compare)])
        if out:
            out_lines = out.splitlines()
            head = out_lines[:12]
            note = f"\n  … 他 {len(out_lines) - 12} 行（全件は /project:start で確認）" if len(out_lines) > 12 else ""
            lines.append("【HP原本との差分（要約）】\n" + "\n".join(head) + note)

    lines.append(
        "╚══ 続きから再開する場合は上記を確認。"
        "汎用知見は DOCS/ESSENCE_INDEX.md、詳しい手順は /project:start ══╝\n"
    )
    print("\n\n".join(lines))


if __name__ == "__main__":
    main()
