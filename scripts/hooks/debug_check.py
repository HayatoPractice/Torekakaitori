#!/usr/bin/env python3
"""
debug_check.py — UserPromptSubmit フック
バグ/エラー関連のプロンプトを検出し、**このプロジェクト固有**の確認項目のみを提示する。

【2026-07-31 改訂】
  「標準デバッグ手順（世間一般）」6項目を削除した。
  理由：エラーメッセージの読解・git diff での直近変更確認・再現手順の最小化・仮説検証は
  現代のコーディングAIが指示なしで既に行う標準挙動であり、毎プロンプトで再提示するのは
  トークンの無駄かつ二重指示（過剰修正の原因）になっていた。
  ここに残すのは「このプロジェクトを知らないと気づけない確認」だけに限定する。
  （方針の根拠：APP_SHARED_RULES.md §10-3「二重指示の禁止」）
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

    print("\n╔══ [DEBUG] このプロジェクト固有の確認項目（参考・一般的なデバッグ手順は省略） ══╗")
    print("  ① npm run tsc:check — TypeScript 型エラーの確認")
    print("  ② git diff で意図しない変更の混入を確認")
    print("  ③ scripts/find_impact.py で変更の影響範囲を確認")
    print("  ④ INCIDENTS ライブラリで同様の事例を参照（参考として）")
    print("  ⑤ DOCS/CODE_ANTI_PATTERNS.md で定番の落とし穴を確認")
    print("╚══════════════════════════════════════════════════════════╝\n")


if __name__ == "__main__":
    main()
