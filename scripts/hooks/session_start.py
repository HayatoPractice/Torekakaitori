#!/usr/bin/env python3
"""
session_start.py — SessionStart フック（セッション開始時の「続き」自動表示）APP版

【出力内容】
  1. MINUTES.md の TL;DR テーブル（前回の状態を5秒で把握）
  2. git status --short（作業フォルダの変更状況）
  3. compare_origins.py の結果（スクリプトがある場合のみ・要約）
  4. 原本フォルダの場合のみ：アプリ固有ファイル混入チェック
     （2026-08-01 の事故で VintVerify の実コードが原本直下に混入していたことを受けて追加。
     scripts/create_new_app.py が存在する＝ここは原本、という判定で発火する）
  5. 月が変わって最初のセッションでは、check_ecosystem_health.py --fetch を自動実行
     （未コミット放置・バックアップクローンのHEADドリフトをユーザーが手動で確認し忘れないよう、
     状態ファイル ~/.origin_watch/last_ecosystem_check.txt で「今月まだ実行していないか」を判定して発火）

【安全方針】
  例外が出ても黙って終了し、セッション開始を妨げない。
"""

import sys
import json
import subprocess
from datetime import datetime
from pathlib import Path

ECOSYSTEM_CHECK_STATE = Path("/Users/sasakihayato/.origin_watch/last_ecosystem_check.txt")


def run(cmd, timeout=20):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout).stdout.strip()
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

    # 4) 原本フォルダの場合のみ：アプリ固有ファイル混入チェック
    if (root / "scripts" / "create_new_app.py").exists():
        forbidden = [
            "src", "supabase", "public", "package.json", "package-lock.json",
            "next.config.ts", "tsconfig.json", "eslint.config.mjs", "postcss.config.mjs",
            "dist", "node_modules", ".next",
        ]
        found = [name for name in forbidden if (root / name).exists()]
        if found:
            lines.append(
                "⚠️ 【原本フォルダ混入チェック】アプリ固有ファイルが原本直下に見つかりました: "
                + ", ".join(found)
                + "\n  → 原本はテンプレート専用です。特定アプリの実装がここに紛れ込んでいないか確認してください"
                  "（2026-08-01 に VintVerify のコード一式が原本に混入していた事故があります）。"
            )

    # 5) 月初めの自動エコシステム点検（scripts/check_ecosystem_health.py・月1回だけ発火）
    #    ユーザーが手動実行を忘れることを見越し、原本フォルダでのセッション開始時に
    #    月が変わっていたら自動でネットワーク込みのフル点検を実行する。
    health_check = root / "scripts" / "check_ecosystem_health.py"
    if health_check.exists():
        this_month = datetime.now().strftime("%Y-%m")
        last_month = None
        try:
            if ECOSYSTEM_CHECK_STATE.exists():
                last_month = ECOSYSTEM_CHECK_STATE.read_text(encoding="utf-8").strip()
        except Exception:
            pass
        if last_month != this_month:
            out = run(["python3", str(health_check), "--fetch"], timeout=90)
            if out:
                lines.append("【月初自動点検｜check_ecosystem_health.py --fetch】\n" + out)
            try:
                ECOSYSTEM_CHECK_STATE.parent.mkdir(parents=True, exist_ok=True)
                ECOSYSTEM_CHECK_STATE.write_text(this_month, encoding="utf-8")
            except Exception:
                pass

    lines.append(
        "╚══ 続きから再開する場合は上記を確認。"
        "汎用知見は DOCS/ESSENCE_INDEX.md、詳しい手順は /project:start ══╝\n"
    )
    print("\n\n".join(lines))


if __name__ == "__main__":
    main()
