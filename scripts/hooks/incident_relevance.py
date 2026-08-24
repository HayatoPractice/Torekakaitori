#!/usr/bin/env python3
"""
incident_relevance.py — PreToolUse(Edit|Write) フック：関連インシデントだけを表示する

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

【安全方針】
  読み取り専用・非ブロッキング。例外が出ても黙って終了し、編集を一切妨げない。
"""

import json
import re
import sys
from pathlib import Path

INCIDENT_INDEX = Path("/Users/sasakihayato/アプリ作成関連/アプリ作成/インシデント管理/INCIDENT_INDEX.md")
MAX_HAYSTACK_CHARS = 20000
MAX_SHOWN = 6


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
    lines = ["\n╔══ [INCIDENTS] 関連する可能性のある過去事例 ══╗"]
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
