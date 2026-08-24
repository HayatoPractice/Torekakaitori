#!/usr/bin/env python3
"""
incident_relevance.py — PreToolUse(Edit|Write|Bash) フック：関連インシデントだけを表示する

【背景】
  旧方式は、編集・保存のたびに INCIDENT_INDEX.md の「技術スタック別クイック検索」表
  （2026-08-24時点で68行・約2,700トークン）を無条件に丸ごと表示していた。
  内容と無関係でも毎回同じ分量が出るため、_PRE_CHECKLIST.md（117項目・20分）が
  読まれなかったのと同じ構造の失敗になっていた（記録は増えるほど1件あたり読まれなくなる）。

  この版は、今まさに編集しようとしているファイルパス・内容と、インシデントの
  タグを突き合わせ、**関連するものだけ**を表示する。無関係なら何も表示しない
  （静かにする方が、常に大量表示するより結果的に読まれる）。

【マッチング方法】
  INCIDENT_INDEX.md の「技術スタック別クイック検索」表からタグ（`/` 区切り、
  バッククォート任意）を抽出し、file_path + 変更後テキストの中に部分一致するかを見る。
  正規表現ではなく単純な部分文字列一致（タグに `.` `(` 等の記号が含まれても安全なため）。

【Bash対応（2026-08-24追加）】
  `rm` でファイルを消す・`DROP TABLE`/`DELETE FROM` 等でDBを消すといった削除操作は
  Edit/Write を経由しないため、Edit|Write だけを監視していると最も刺さってほしい
  場面（INC-011・026・056 はまさにテーブル削除時の事故）で発動しなかった。
  Bashコマンドも監視対象に加えるが、`ls`/`npm run build` 等の大多数の無害なコマンドで
  毎回発動すると同じ「毎回表示される→読まれなくなる」失敗を繰り返すため、
  DESTRUCTIVE_BASH_MARKERS に一致する**破壊的な操作に見えるコマンドだけ**を対象にする。

【安全方針】
  読み取り専用・非ブロッキング。例外が出ても黙って終了し、編集・実行を一切妨げない。
"""

import json
import re
import sys
from pathlib import Path

INCIDENT_INDEX = Path("/Users/sasakihayato/アプリ作成関連/アプリ作成/インシデント管理/INCIDENT_INDEX.md")
MAX_HAYSTACK_CHARS = 20000
MAX_SHOWN = 6

# Bashコマンドのうち、これらのいずれかに一致する場合のみ「破壊的操作」とみなして検査する
# （大多数の無害なコマンドで毎回発動するとノイズになり読まれなくなるため、事前に絞り込む）。
# "rm"・"rmdir" は単語境界付きの正規表現で判定する。単純な部分一致だと
# "confirm"（内部に "rm " を含む）等に誤反応するため。
DESTRUCTIVE_BASH_WORD_PATTERNS = [re.compile(r"\brm\b"), re.compile(r"\brmdir\b")]
DESTRUCTIVE_BASH_SUBSTRINGS = [
    "unlink(", "shutil.rmtree", "os.remove",
    "drop table", "drop column", "truncate", "delete from",
    "git clean", "git reset --hard",
]


def looks_destructive(command_lower):
    if any(sub in command_lower for sub in DESTRUCTIVE_BASH_SUBSTRINGS):
        return True
    return any(p.search(command_lower) for p in DESTRUCTIVE_BASH_WORD_PATTERNS)


def parse_quick_search_rows(text):
    """3列（タグ | INC番号 | ヒント）の表の行だけを抽出する。
    全インシデント一覧（7列）等、他の表は列数の違いで自然に除外される。
    """
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith("|") or not line.endswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) != 3:
            continue
        tag_cell, inc_cell, hint_cell = cells
        inc_ids = re.findall(r"INC-\d+", inc_cell)
        if not inc_ids:
            continue  # ヘッダー行・区切り行・「（未登録）」行を除外
        tags = [t.replace("`", "").strip() for t in tag_cell.split("/")]
        tags = [t for t in tags if t]
        if not tags:
            continue
        rows.append({"tags": tags, "inc_ids": inc_ids, "hint": hint_cell})
    return rows


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return

    tool_input = data.get("tool_input", {}) or {}
    command = tool_input.get("command")

    if isinstance(command, str):
        # Bash呼び出し：破壊的操作に見えるコマンドだけを対象にする（ノイズ防止）
        lowered = command.lower()
        if not looks_destructive(lowered):
            return
        haystack = command[:MAX_HAYSTACK_CHARS].lower()
    else:
        # Edit/Write呼び出し：ファイルパス・変更内容を対象にする
        file_path = tool_input.get("file_path", "") or ""
        haystack_parts = [file_path]
        for key in ("new_string", "content", "old_string"):
            val = tool_input.get(key)
            if isinstance(val, str):
                haystack_parts.append(val)
        haystack = "\n".join(haystack_parts)[:MAX_HAYSTACK_CHARS].lower()

    if not haystack.strip():
        return

    try:
        text = INCIDENT_INDEX.read_text(encoding="utf-8")
    except Exception:
        return

    rows = parse_quick_search_rows(text)
    matched = []
    seen_inc = set()
    for row in rows:
        if any(tag.lower() in haystack for tag in row["tags"]):
            key = tuple(row["inc_ids"])
            if key in seen_inc:
                continue
            seen_inc.add(key)
            matched.append(row)

    if not matched:
        return  # 関連なし → 何も表示しない（これが今回の主眼）

    matched = matched[:MAX_SHOWN]
    title = "破壊的操作に関連する可能性のある過去事例（削除前に確認）" if isinstance(command, str) else "関連する可能性のある過去事例"
    lines = [f"\n╔══ [INCIDENTS] {title} ══╗"]
    for row in matched:
        ids = ", ".join(row["inc_ids"])
        lines.append(f"  {ids}｜{row['hint']}")
    lines.append(
        "  → 詳細は インシデント管理/INCIDENT_INDEX.md の該当ファイルを確認してください。"
    )
    lines.append("╚══════════════════════════════════════════╝\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
