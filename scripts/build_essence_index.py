#!/usr/bin/env python3
"""
build_essence_index.py — DOCS/ESSENCE_INDEX.md を各ファイルの「📌 汎用エッセンス」から自動生成

【目的】
  同じエッセンスが「各ファイルのヘッダ」と「ESSENCE_INDEX」の2箇所に存在し、
  更新時にズレる（ドリフト）リスクがあった。
  → 各ファイルのヘッダを唯一の正とし、ESSENCE_INDEX はここから機械生成する。
  これで手動更新が不要になり、ドリフトが原理的に起きなくなる。

【使い方】
  python3 scripts/build_essence_index.py          # 生成して書き込み
  python3 scripts/build_essence_index.py --check  # 現状と一致するか検証（CI用・書き込まない）

【正の源（Single Source of Truth）】
  各 DOCS/*.md 冒頭の "> 📌 **汎用エッセンス" ブロックの "> - " 行。
  ファイルにヘッダが未設定の場合は「（📌汎用エッセンスヘッダが未設定）」と表示。
"""

import sys
import re
from pathlib import Path

DOCS = Path(__file__).resolve().parent.parent / "DOCS"
OUT = DOCS / "ESSENCE_INDEX.md"

# カテゴリ → [(ファイル名, 短い説明)] の順序定義（表示順とグルーピングのみ管理）
CATEGORIES = [
    ("🧭 行動・運用", [
        ("APP_SHARED_RULES.md", "全AI共通行動規範"),
        ("MASTER_LESSONS.md", "確定教訓・全プロジェクト共通"),
        ("SERVICE_ORG_CORE.md", "フェーズ・役割定義"),
    ]),
    ("🏗️ 設計・コード品質", [
        ("CODE_ANTI_PATTERNS.md", "コーディングの失敗回避"),
        ("APP_DESIGN_STANDARDS.md", "UIデザイン品質基準"),
        ("APP_STRUCTURE_REFERENCE.md", "ファイル構成基準"),
    ]),
    ("⚡ ツール・自動化", [
        ("AI_TOOLS_REFERENCE.md", "AIツール活用"),
        ("AUTO_SYNC_GUIDE.md", "自動同期の仕組み"),
        ("TOOL_REFERENCE.md", "開発ツール一覧"),
    ]),
    ("⚖️ 品質・法務・性能", [
        ("PERFORMANCE_GUIDE.md", "パフォーマンス指標"),
        ("LEGAL_AND_RELEASE.md", "リリース・法的コンプラ"),
    ]),
]

# 📌ブロックから "> - …" の箇条書きを抽出
BULLET_RE = re.compile(r"^>\s*-\s*(.+?)\s*$")


def extract_essence(md_path: Path) -> list[str]:
    if not md_path.exists():
        return []
    lines = md_path.read_text(encoding="utf-8").splitlines()
    bullets, capturing = [], False
    for line in lines:
        if "📌" in line and "汎用エッセンス" in line:
            capturing = True
            continue
        if capturing:
            m = BULLET_RE.match(line)
            if m:
                bullets.append(m.group(1))
            elif line.strip().startswith(">") and ("ESSENCE_INDEX" in line or "集約" in line):
                break
            elif not line.strip().startswith(">"):
                break
    return bullets


def build() -> str:
    out = []
    out.append("# ESSENCE_INDEX.md — 汎用エッセンス集約（自動生成・編集禁止）\n")
    out.append("> **⚠️ このファイルは `scripts/build_essence_index.py` が各ファイルの「📌汎用エッセンス」**")
    out.append("> **ヘッダから自動生成します。直接編集せず、各ファイルのヘッダを修正して再生成すること。**")
    out.append(">")
    out.append("> **目的：** 今の作業に直接関係しない重量級ファイルも、"
               "その「他作業にも効く普遍原則」だけここで安く把握する。")
    out.append("> ここを読んで関係しそうなファイルだけ本文をピンポイントで開く（全文一括読み禁止）。\n")
    out.append("---\n")

    for cat_title, items in CATEGORIES:
        out.append(f"## {cat_title}\n")
        for fname, desc in items:
            bullets = extract_essence(DOCS / fname)
            out.append(f"### {fname}（{desc}）")
            if bullets:
                for b in bullets:
                    out.append(f"- {b}")
            else:
                out.append("- （📌汎用エッセンスヘッダが未設定）")
            out.append("")
        out.append("---\n")

    out.append("## 📂 汎用性が低い（タスク限定）ファイル ※必要時のみ本文へ")
    out.append("- CLAUDE_CODE_GUIDE.md（Claude Code 機能リファレンス）")
    out.append("- GAS_DEVELOPMENT_GUIDE.md（GAS特有の実装ガイド）")
    out.append("- GITHUB_ACTIONS_GUIDE.md（CI/CD設定ガイド）")
    out.append("- UI_LIBRARY_GUIDE.md・APP_UX_STANDARDS.md（UI実装時のみ）")
    out.append("- LEGAL_COMPLIANCE.md（業種別法的コンプラ・プロジェクト特定時のみ）")
    out.append("- CROSS_REFERENCE.md・DOCS_INDEX.md（索引・ナビゲーション用）\n")
    out.append("---\n")
    out.append("ESSENCE_INDEX.md — `build_essence_index.py` による自動生成。"
               "正の源は各ファイル冒頭の「📌汎用エッセンス」。")
    return "\n".join(out) + "\n"


def main():
    content = build()
    if "--check" in sys.argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current.strip() == content.strip():
            print("✅ ESSENCE_INDEX.md は最新（ドリフトなし）")
            return 0
        print("⚠️ ESSENCE_INDEX.md がヘッダと不一致。`python3 scripts/build_essence_index.py` で再生成してください。")
        return 1
    OUT.write_text(content, encoding="utf-8")
    print(f"✅ 生成: {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
