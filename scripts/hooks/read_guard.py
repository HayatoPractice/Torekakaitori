#!/usr/bin/env python3
"""
read_guard.py — PreToolUse(Read) フック：重量級ファイルの「全文読み」を抑止する非ブロッキング警告

【目的】
  軽量読込（索引→必要分のみ）に従わず、重量級ファイルを offset/limit 無しで全文 Read すると
  トークンを浪費する。その「行動」が起きる瞬間に警告を出し、索引＋部分読みへ誘導する。

【判定】
  - 対象は .md ファイル。サイズが THRESHOLD を超え、かつ limit 指定が無い（＝全文読み）場合のみ警告。
  - 既に offset/limit で部分読みしている場合は良い挙動なので何もしない。
  - ハードコードのファイル名リストではなく「サイズ閾値」で自動判定（保守不要）。

【方式】
  非ブロッキング（警告のみ・Read 自体は実行される）。AIは警告を見て以降は部分読みに切り替える。
"""

import sys
import os
import json

THRESHOLD_BYTES = 12000  # ~4,000 tok。これを超える .md の全文読みを警告する


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return

    ti = data.get("tool_input", {}) or {}
    fp = ti.get("file_path", "")
    if not fp or not fp.endswith(".md"):
        return

    # 既に部分読み（limit 指定あり）＝望ましい挙動 → 何もしない
    if ti.get("limit") is not None:
        return

    try:
        size = os.path.getsize(fp)
    except Exception:
        return
    if size < THRESHOLD_BYTES:
        return

    name = os.path.basename(fp)
    tok = size // 3
    hint = "（APP_SHARED_RULES.md は冒頭に §見出し索引あり）" if name == "APP_SHARED_RULES.md" else ""
    print(
        f"\n⚠️ [read-guard] {name} は約{tok:,}tokの重量級ファイルです。全文読みはトークンを浪費します。\n"
        f"  → まず DOCS/ESSENCE_INDEX.md（汎用エッセンス）か該当ファイル冒頭の索引で必要箇所を特定し、\n"
        f"    Read の offset/limit で『該当部分だけ』を読むこと。{hint}\n"
    )


if __name__ == "__main__":
    main()
