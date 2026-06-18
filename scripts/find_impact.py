#!/usr/bin/env python3
"""
find_impact.py
影響範囲分析スクリプト。
指定したキーワード（関数名やファイル名など）がプロジェクト内のどこから参照されているかを
素早く検索して出力する。AIが手動でgrepする手間とトークン消費を抑える目的で利用する。
"""

import sys
import subprocess
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 find_impact.py <keyword>")
        sys.exit(1)
    
    keyword = sys.argv[1]
    print(f"[*] Searching impact for: '{keyword}'...")
    
    # 検索対象とする拡張子
    includes = [
        "--include=*.md",
        "--include=*.py",
        "--include=*.sh",
        "--include=*.json",
        "--include=*.html",
        "--include=*.js",
        "--include=*.css",
    ]
    
    # node_modules や不要なキャッシュディレクトリを除外
    excludes = [
        "--exclude-dir=node_modules",
        "--exclude-dir=.git",
        "--exclude-dir=__pycache__",
        "--exclude-dir=.claude",
    ]
    
    try:
        cmd = ["grep", "-rn", keyword, "."] + includes + excludes
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print("[*] Found references:")
            print(result.stdout)
        else:
            print("[*] No references found.")
    except Exception as e:
        print(f"[!] Error executing search: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
