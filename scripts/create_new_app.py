#!/usr/bin/env python3
"""
create_new_app.py — 新規アプリプロジェクトを対話式で自動作成するスクリプト

【使い方】
    python3 scripts/create_new_app.py

【動作】
    1. 新規アプリ名を入力させる
    2. プロジェクト規模（Lite/Pro）を選択させる
    3. 初期技術スタック（Next.js/Python等）を選択させる
    4. アプリ作成ディレクトリに新しいアプリフォルダを作成しテンプレートをコピー
    5. Lite版なら不要なドキュメントを削除
    6. プロジェクト固有ファイルを初期化テンプレートに置き換え
    7. 選択された技術スタックの初期化コマンドを実行
    8. git init する
    9. AIヒアリング用の初回プロンプトをクリップボードにコピー
    10. CLI上でそのままAI（Gemini）を起動するか確認する

【注意】
    - このスクリプトは「アプリ作成原本」ディレクトリから実行すること
"""

import subprocess
import shutil
import sys
from datetime import datetime
from pathlib import Path

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 設定
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ORIGIN = Path(__file__).parent.parent  # アプリ作成原本/
TEMPLATE_DIR = ORIGIN / "app-template"
APPS_DIR = ORIGIN.parent  # アプリ作成/ 直下に新アプリを作成

# テンプレートから除外するもの（コピーしない）
EXCLUDE_FROM_TEMPLATE = {".git", ".DS_Store", "__pycache__", "node_modules"}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 初期化テンプレート
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIREMENTS_LOG_TEMPLATE = """\
# REQUIREMENTS_LOG.md — 機能要件・技術的負債・バージョンロック記録
最終更新：{date}

---

## 機能要件

### 確定済み要件

（まだなし）
※ 現在AIヒアリングモード待機中。ユーザーとの対話を通じてここに要件を整理してください。

### 未決定・検討中

（まだなし）

---

## 技術的負債

（まだなし）

---

## バージョンロック記録

| パッケージ | バージョン | ロック理由 |
|:---|:---|:---|
| — | — | — |

---

REQUIREMENTS_LOG.md v1.0 — {app_name} プロジェクト用
"""

MINUTES_TEMPLATE = """\
# MINUTES.md — セッション引き継ぎ議事録
最終更新：{date}

---

## ★ TL;DR（5秒で現状を把握）

| 項目 | 内容 |
|:---|:---|
| プロジェクト | {app_name} |
| 現在のフェーズ | 🔶 初期セットアップ |
| 状態 | 初期セットアップ完了・要件定義待ち |
| 前回完了 | プロジェクト新規作成 |
| 次のタスク | 要件定義（ユーザーにヒアリングを実施し、REQUIREMENTS_LOG.md に記入する） |
| ブロッカー | なし |

---

## 技術スタック（確定後に記入）

| 分野 | 選定技術 | 理由 |
|:---|:---|:---|
| プロジェクト規模 | {scale} | 初期セットアップで選択 |
| 初期テンプレート | {tech} | 初期セットアップで選択 |
| フロントエンド | 未定 | — |
| バックエンド | 未定 | — |
| データベース | 未定 | — |

---

## セッション履歴

### {date} — SESSION #1

- create_new_app.py でプロジェクトを新規作成した
- 規模 [{scale}]、テンプレート [{tech}] で初期化した

---

MINUTES.md v1.0 — {app_name} プロジェクト用
"""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ユーティリティ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def print_header():
    print("")
    print("━" * 50)
    print("  🚀 新規アプリ作成スクリプト (Ultimate Auto)")
    print("━" * 50)
    print("")

def print_step(n: int, text: str):
    print(f"  [{n}] {text}")

def print_ok(text: str):
    print(f"      ✅ {text}")

def print_skip(text: str):
    print(f"      ⏭️  {text}")

def print_err(text: str):
    print(f"      ❌ {text}", file=sys.stderr)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 主要ロジック
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def get_app_name() -> str:
    """アプリ名を対話式で取得する。"""
    while True:
        name = input("  🔤 新規アプリ名を入力してください（例: my-app）: ").strip()
        if not name:
            print("     ⚠️  アプリ名を入力してください。")
            continue
        forbidden = {'/', '\\', ':', '*', '?', '"', '<', '>', '|'}
        if any(c in forbidden for c in name):
            print(f"     ⚠️  使用できない文字が含まれています: {forbidden & set(name)}")
            continue
        return name

def get_project_scale() -> str:
    """プロジェクトの規模を選択する。"""
    print("")
    print("  📦 プロジェクトの規模（ドキュメントの重さ）を選んでください:")
    print("     1. Lite (小規模ツール・GAS用: 最小限のドキュメントのみ)")
    print("     2. Pro  (本格的なアプリ用: 全てのドキュメントとルールを適用)")
    while True:
        choice = input("  番号を選択してください [1/2]: ").strip()
        if choice == "1": return "Lite"
        if choice == "2": return "Pro"
        print_err("無効な入力です。")

def get_tech_stack() -> str:
    """初期化する技術スタックを選択する。"""
    print("")
    print("  🛠️  初期化する技術スタック（ボイラープレート）を選んでください:")
    print("     1. Next.js (Web/App)")
    print("     2. Python (Script/CLI)")
    print("     3. GAS (Google Apps Script)")
    print("     4. None (ドキュメントのみ)")
    while True:
        choice = input("  番号を選択してください [1/2/3/4]: ").strip()
        if choice == "1": return "Next.js"
        if choice == "2": return "Python"
        if choice == "3": return "GAS"
        if choice == "4": return "None"
        print_err("無効な入力です。")

def confirm_destination(app_dir: Path) -> bool:
    """作成先を確認する。"""
    print("")
    print(f"  📁 作成先: {app_dir}")
    answer = input("  ❓ この場所に作成しますか？ (y/N): ").strip().lower()
    return answer == 'y'

def copy_template(src: Path, dst: Path):
    """テンプレートを新しいフォルダへコピーする。"""
    for item in src.iterdir():
        if item.name in EXCLUDE_FROM_TEMPLATE:
            continue
        target = dst / item.name
        if item.is_dir():
            shutil.copytree(item, target, ignore=shutil.ignore_patterns(*EXCLUDE_FROM_TEMPLATE))
        else:
            shutil.copy2(item, target)
    print_ok("テンプレートのコピー完了")

def apply_project_scale(app_dir: Path, scale: str):
    """Lite版の場合、重厚な組織・設計ルールを削除する。"""
    if scale == "Lite":
        removes = [
            "DOCS/SERVICE_ORG_CORE.md",
            "DOCS/SERVICE_ORG_PHASE.md",
            "DOCS/PERFORMANCE_GUIDE.md",
            "DOCS/UI_LIBRARY_GUIDE.md",
            "DOCS/APP_DESIGN_STANDARDS.md",
            "DOCS/APP_UX_STANDARDS.md",
            "DOCS/CODE_ANTI_PATTERNS.md",
            "DOCS/APP_STRUCTURE_REFERENCE.md"
        ]
        for rel in removes:
            t = app_dir / rel
            if t.exists():
                t.unlink()
                print_skip(f"Lite設定のため削除: {rel}")

def reset_project_files(app_dir: Path, app_name: str, date_str: str, scale: str, tech: str):
    """プロジェクト固有の管理ファイルを初期状態にリセットする。"""
    templates = {
        "DOCS/REQUIREMENTS_LOG.md": REQUIREMENTS_LOG_TEMPLATE,
        "MINUTES.md": MINUTES_TEMPLATE,
    }
    for rel_path, template in templates.items():
        target = app_dir / rel_path
        if target.exists():
            content = template.format(app_name=app_name, date=date_str, scale=scale, tech=tech)
            target.write_text(content, encoding="utf-8")
            print_ok(f"初期化: {rel_path}")

def apply_tech_stack(app_dir: Path, tech: str):
    """選択された技術スタックの初期コードを生成する。"""
    if tech == "Next.js":
        print_ok("Next.js プロジェクトを初期化します (npx create-next-app)...")
        cmd = ["npx", "-y", "create-next-app@latest", ".", "--typescript", "--tailwind", "--eslint", "--app", "--src-dir", "--import-alias", "@/*"]
        subprocess.run(cmd, cwd=app_dir)
    elif tech == "Python":
        print_ok("Python プロジェクトを初期化します...")
        src = app_dir / "src"
        src.mkdir(exist_ok=True)
        (src / "main.py").write_text('print("Hello World")\n')
        (app_dir / "requirements.txt").write_text("")
    elif tech == "GAS":
        print_ok("GAS プロジェクトを初期化します...")
        src = app_dir / "src"
        src.mkdir(exist_ok=True)
        (src / "Code.gs").write_text('function myFunction() {\n}\n')

def git_init(app_dir: Path):
    """新規アプリフォルダで git init する。"""
    try:
        subprocess.run(["git", "init"], cwd=app_dir, check=True, capture_output=True)
        print_ok("git init 完了")
    except subprocess.CalledProcessError as e:
        print_err(f"git init に失敗しました: {e.stderr.decode()}")

def auto_kickoff(app_dir: Path, app_name: str):
    """AI用のプロンプトをクリップボードにコピーし、自動起動を促す。"""
    prompt = f"新規プロジェクト「{app_name}」を作成しました。私は人間です。MINUTES.md を読み、現在のフェーズに従って私に要件のヒアリング（AIヒアリングモード）を開始してください。"
    
    try:
        process = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE, encoding='utf8')
        process.communicate(prompt)
        print("")
        print_ok("📋 AI起動用プロンプトをクリップボードにコピーしました！")
    except Exception:
        print_err("クリップボードへのコピーがサポートされていません。以下のプロンプトを手動でコピーしてください:")
        print(f"    {prompt}")
    
    print("")
    print("  🤖 AIエージェント（Gemini CLI等）を今すぐ起動しますか？")
    ans = input("  起動する？ (y/N): ").strip().lower()
    if ans == 'y':
        try:
            print_ok("Gemini CLI を起動します...")
            subprocess.run(["gemini"], cwd=app_dir)
        except Exception as e:
            print_err(f"起動に失敗しました: {e}\nご自身でCLIやエディタから起動してください。")

def print_next_steps(app_dir: Path, app_name: str):
    """次のステップ案内を表示する。"""
    print("")
    print("━" * 50)
    print(f"  ✨ {app_name} の作成が完了しました！")
    print("━" * 50)
    print("")
    print("  📋 次のステップ：")
    print(f"     1. cd \"{app_dir}\"")
    print("     2. AIにペーストしてヒアリングを開始する")
    print("")

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# エントリーポイント
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def main():
    print_header()

    if not TEMPLATE_DIR.exists():
        print_err(f"テンプレートフォルダが見つかりません: {TEMPLATE_DIR}")
        sys.exit(1)

    app_name = get_app_name()
    scale = get_project_scale()
    tech = get_tech_stack()
    app_dir = APPS_DIR / app_name

    if app_dir.exists():
        print_err(f"フォルダが既に存在します: {app_dir}")
        sys.exit(1)

    if not confirm_destination(app_dir):
        print("  ⛔️ キャンセルしました。")
        sys.exit(0)

    print("")
    date_str = datetime.now().strftime("%Y-%m-%d")

    print_step(1, "テンプレートをコピー中...")
    app_dir.mkdir(parents=True)
    copy_template(TEMPLATE_DIR, app_dir)

    print("")
    print_step(2, "プロジェクト規模の適用...")
    apply_project_scale(app_dir, scale)

    print("")
    print_step(3, "プロジェクト固有ファイルを初期化中...")
    reset_project_files(app_dir, app_name, date_str, scale, tech)

    print("")
    print_step(4, "技術スタックの初期コードを生成中...")
    apply_tech_stack(app_dir, tech)

    print("")
    print_step(5, "Git リポジトリを初期化中...")
    git_init(app_dir)

    print_next_steps(app_dir, app_name)
    auto_kickoff(app_dir, app_name)


if __name__ == "__main__":
    main()
