#!/usr/bin/env python3
"""
compare_origins.py — アプリ作成原本 ↔ ホームページ作成原本 相互監視スクリプト（§30）

【動作】
- 両原本フォルダの git log を読み取り専用で取得する（どちらのフォルダも一切編集しない）
- 前回チェック以降の新着コミットのみを表示する（LAST_CHECK 方式）
- 状態ファイル: /Users/sasakihayato/.origin_watch/last_check.txt（中立地帯）

【実行】
  python3 scripts/compare_origins.py          # 通常実行（新着のみ表示）
  python3 scripts/compare_origins.py --days 30 # 過去 N 日分を表示（状態リセット）
  python3 scripts/compare_origins.py --reset   # 状態ファイルをリセット（次回全表示）

【制約】
- ホームページ作成フォルダは参照のみ。一切の書き込みを行わない。
- アプリ作成原本フォルダも参照のみ（このスクリプト自身のフォルダも同様）。
"""

import sys
import subprocess
from pathlib import Path
from datetime import datetime, timedelta, timezone

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 設定
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

APP_ORIGIN = Path("/Users/sasakihayato/アプリ作成関連/アプリ作成/アプリ作成原本")
HP_ORIGIN  = Path("/Users/sasakihayato/ホームページ作成/ホームページ作成原本")

WATCH_DIR   = Path("/Users/sasakihayato/.origin_watch")
STATE_FILE  = WATCH_DIR / "last_check.txt"

DEFAULT_DAYS = 30  # 初回実行時に遡る日数


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ユーティリティ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def read_last_check() -> datetime | None:
    """状態ファイルから前回チェック日時を読み込む。存在しなければ None を返す。"""
    if not STATE_FILE.exists():
        return None
    try:
        ts = STATE_FILE.read_text(encoding="utf-8").strip()
        return datetime.fromisoformat(ts)
    except Exception:
        return None


def write_last_check(dt: datetime) -> None:
    """状態ファイルに現在の日時を書き込む（中立地帯のみ）。"""
    WATCH_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(dt.isoformat(), encoding="utf-8")


def git_log_since(repo_dir: Path, since: datetime) -> list[str]:
    """指定リポジトリの since 以降のコミットを取得する（読み取り専用）。"""
    if not repo_dir.exists():
        return []
    since_str = since.strftime("%Y-%m-%d %H:%M:%S")
    try:
        result = subprocess.run(
            [
                "git", "-C", str(repo_dir),
                "log",
                f"--since={since_str}",
                "--pretty=format:%ci %s",
                "--name-only",
                "--no-merges",
            ],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout.strip().splitlines() if result.returncode == 0 else []
    except Exception:
        return []


def parse_log_entries(lines: list[str]) -> list[dict]:
    """git log の出力（コミット行 + ファイル名行の交互）をパースする。"""
    entries = []
    current = None
    for line in lines:
        line = line.strip()
        if not line:
            if current:
                entries.append(current)
                current = None
            continue
        # "YYYY-MM-DD HH:MM:SS +0900 コミットメッセージ" の形式
        parts = line.split(" ", 3)
        if len(parts) >= 4 and len(parts[0]) == 10 and parts[0][4] == "-":
            current = {
                "date": f"{parts[0]} {parts[1]}",
                "message": parts[3] if len(parts) > 3 else "",
                "files": [],
            }
        elif current is not None:
            current["files"].append(line)
    if current:
        entries.append(current)
    return entries


def format_entries(label: str, entries: list[dict]) -> list[str]:
    """コミット一覧を表示用テキストに変換する。"""
    if not entries:
        return [f"【{label}】新着なし"]
    lines = [f"【{label}】{len(entries)} 件の新着コミット"]
    for e in entries:
        files = "、".join(e["files"][:3])
        if len(e["files"]) > 3:
            files += f"… 他{len(e['files'])-3}件"
        files_str = f"（{files}）" if files else ""
        lines.append(f"  {e['date']}  {e['message']}{files_str}")
    return lines


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# メイン
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def main():
    args = sys.argv[1:]
    reset = "--reset" in args

    # --days N オプションの解析
    days = None
    if "--days" in args:
        idx = args.index("--days")
        if idx + 1 < len(args):
            try:
                days = int(args[idx + 1])
            except ValueError:
                pass

    now = datetime.now()

    if reset:
        write_last_check(now)
        print("状態ファイルをリセットしました。次回実行時から新着のみ表示します。")
        return

    # since の決定
    if days is not None:
        since = now - timedelta(days=days)
        print(f"過去 {days} 日分の変更を表示します（--days モード）")
    else:
        last_check = read_last_check()
        if last_check is None:
            since = now - timedelta(days=DEFAULT_DAYS)
            print(f"初回実行：過去 {DEFAULT_DAYS} 日分の変更を表示します")
        else:
            since = last_check
            print(f"前回チェック：{since.strftime('%Y-%m-%d %H:%M')} 以降の新着を表示します")

    print()

    # APP 側の新着（参照のみ・自分自身のコミット確認用）
    app_lines = git_log_since(APP_ORIGIN, since)
    app_entries = parse_log_entries(app_lines)

    # HP 側の新着（参照のみ・絶対に書き込みしない）
    hp_lines = git_log_since(HP_ORIGIN, since)
    hp_entries = parse_log_entries(hp_lines)

    # 表示
    for line in format_entries("APP側（アプリ作成原本）の変更", app_entries):
        print(line)
    print()
    for line in format_entries("HP側（ホームページ作成原本）の変更", hp_entries):
        print(line)

    # HP 側に新着がある場合は活用候補を促す
    if hp_entries:
        print()
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("HP 側に新着があります。アプリ作成原本への活用を検討してください。")
        print("（HP 側フォルダは参照のみ。絶対に編集しないこと）")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    # --days モードでなければ状態ファイルを更新
    if days is None:
        write_last_check(now)
        print(f"\n状態ファイルを更新しました（{now.strftime('%Y-%m-%d %H:%M')}）")


if __name__ == "__main__":
    main()
