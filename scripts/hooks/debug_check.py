#!/usr/bin/env python3
"""
debug_check.py — UserPromptSubmit フック
バグ/エラー関連のプロンプトを検出してデバッグチェックリストを表示する。
"""

import json
import sys


def main():
    try:
        data = json.loads(sys.stdin.read())
        prompt = data.get("user_prompt", "")
    except Exception:
        return

    keywords = [
        "バグ", "bug", "エラー", "error", "不具合", "デバッグ", "debug",
        "動かない", "おかしい", "壊れ", "直して", "直らない",
        "表示されない", "崩れ", "機能しない", "効かない", "失敗",
    ]
    if not any(kw.lower() in prompt.lower() for kw in keywords):
        return

    print("\n╔══ [DEBUG] バグ調査チェックリスト（参考として活用してください） ══╗")
    print("【標準デバッグ手順（世間一般）】")
    print("  ① エラーメッセージ・コンソール出力を正確に読む")
    print("  ② 最近の変更を確認する（git diff / git log --oneline -5）")
    print("  ③ 再現手順を特定・最小化する")
    print("  ④ 問題の範囲を絞り込む（コメントアウト・切り分け）")
    print("  ⑤ 仮説を立てて一つずつ検証する")
    print("  ⑥ 修正後は同様のケースを横断確認する")
    print("")
    print("【このプロジェクト特有の確認】")
    print("  ① npm run tsc:check — TypeScript 型エラーの確認")
    print("  ② git diff で意図しない変更の混入を確認")
    print("  ③ scripts/find_impact.py で変更の影響範囲を確認")
    print("  ④ INCIDENTS ライブラリで同様の事例を参照（参考として）")
    print("  ⑤ DOCS/CODE_ANTI_PATTERNS.md で定番の落とし穴を確認")
    print("╚══════════════════════════════════════════════════════════╝\n")


if __name__ == "__main__":
    main()
