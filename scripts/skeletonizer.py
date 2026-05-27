#!/usr/bin/env python3
# ==============================================================================
# 👤 scripts/skeletonizer.py — コードシグネチャ抽出ユーティリティ
# ==============================================================================
# このスクリプトは、コードファイルから「構造（クラス・関数定義・型）」のみを抽出し、
# 内部ロジックを削ることで、AIエージェントのトークン消費量を最大90%削減します。
# 外部依存ライブラリはなく、標準のPython3環境で高速に動作します。

import sys
import os

WARNING_HEADER = """/*
================================================================================
⚠️ [WARNING: SKELETONIZED FOR CONTEXT]
--------------------------------------------------------------------------------
このコードはトークン削減のために「構造（シグネチャ・定義）」のみを抽出したものです。
関数の内部ロジックや具体的な処理内容は意図的に削られています。

🔴 絶対にこの内容をそのまま生ファイルに上書き保存（破壊）しないでください。
🔴 編集を行う際は、必ず生のファイルを読み込んでから編集してください。
================================================================================
*/"""

def skeletonize_python(content):
    """Pythonコードからシグネチャを抽出する"""
    lines = content.splitlines()
    output = []
    in_docstring = False
    docstring_char = None
    omitted = False
    
    for line in lines:
        stripped = line.strip()
        
        # 1. Docstringの判定
        if not in_docstring:
            if stripped.startswith(('"""', "'''")):
                in_docstring = True
                docstring_char = '"""' if stripped.startswith('"""') else "'''"
                output.append(line)
                # 1行で終わるdocstringの場合
                if stripped.endswith(docstring_char) and len(stripped) > 3:
                    in_docstring = False
                continue
        else:
            output.append(line)
            if stripped.endswith(docstring_char):
                in_docstring = False
            continue
            
        # 2. 構造定義の行 (class, def, async def)
        if stripped.startswith(("def ", "class ", "async def ")):
            output.append(line)
            omitted = False
            continue
            
        # 3. インポートやグローバル定数（インデントが0）は残す
        indent = len(line) - len(line.lstrip())
        if indent == 0 and stripped:
            output.append(line)
            omitted = False
            continue
            
        # 4. ロジック行の省略
        if stripped:
            if not omitted:
                # インデントに合わせたプレースホルダーを挿入
                output.append(" " * indent + "...")
                omitted = True
        else:
            output.append("")
            omitted = False
            
    return "\n".join(output)

def skeletonize_js_ts(content):
    """JavaScript/TypeScriptコードからシグネチャを抽出する"""
    lines = content.splitlines()
    output = []
    brace_level = 0
    in_comment_block = False
    omitted = False
    
    for line in lines:
        stripped = line.strip()
        
        # 1. 複数行コメントの判定
        if not in_comment_block:
            if stripped.startswith("/*"):
                in_comment_block = True
                output.append(line)
                if "*/" in stripped:
                    in_comment_block = False
                continue
        else:
            output.append(line)
            if "*/" in stripped:
                in_comment_block = False
            continue
            
        # 2. 1行コメント
        if stripped.startswith("//"):
            output.append(line)
            continue
            
        # 3. 波括弧のネストカウント
        prev_level = brace_level
        
        # 文字列リテラル内の括弧を簡易的に除外するための簡易置換
        clean_stripped = re_sub_quotes(stripped)
        open_braces = clean_stripped.count("{")
        close_braces = clean_stripped.count("}")
        brace_level += open_braces - close_braces
        
        # 4. ネストが0（トップレベル定義、インポート、クラス宣言、関数シグネチャ）
        if prev_level == 0 or stripped.startswith(("export ", "import ", "class ", "interface ", "type ", "enum ", "function ")):
            output.append(line)
            omitted = False
            continue
            
        # 5. ロジック行の省略
        if brace_level > 0:
            if not omitted:
                indent = len(line) - len(line.lstrip())
                output.append(" " * indent + "// ... logic omitted ...")
                omitted = True
        else:
            # 波括弧が閉じる行は出力する
            output.append(line)
            omitted = False
            
    return "\n".join(output)

def re_sub_quotes(s):
    """文字列内の括弧による誤判定を防ぐため、クォーテーション内を削除する簡易ヘルパー"""
    # ダブルクォート、シングルクォート、バッククォート内を簡易置換
    s = s.replace('\\"', '').replace("\\'", "")
    s = re_replace(r'"[^"\\]*"', '""', s)
    s = re_replace(r"'[^'\\]*'", "''", s)
    s = re_replace(r"`[^`\\]*`", "``", s)
    return s

def re_replace(pattern, repl, string):
    """標準モジュール re の簡易ラッパー（エラーハンドリング付き）"""
    try:
        import re
        return re.sub(pattern, repl, string)
    except Exception:
        return string

def main():
    if len(sys.argv) < 2:
        print("Usage: python skeletonizer.py <file_path>", file=sys.stderr)
        sys.exit(1)
        
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)
        
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        _, ext = os.path.splitext(file_path)
        ext = ext.lower()
        
        # 警告ヘッダーの付与
        print(WARNING_HEADER)
        
        # 拡張子ごとのパース
        if ext == ".py":
            print(skeletonize_python(content))
        elif ext in (".ts", ".tsx", ".js", ".jsx", ".json"):
            print(skeletonize_js_ts(content))
        else:
            # 未対応の拡張子は、生のままフォールバック
            print(content)
            
    except Exception as e:
        # 万が一のエラー時は生ファイルをそのまま出力してフォールバック
        print(f"// [Skeletonizer Fallback due to error: {str(e)}]")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                print(f.read())
        except Exception:
            pass

if __name__ == "__main__":
    main()
