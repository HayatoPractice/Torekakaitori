#!/bin/bash
# check_code.sh
# 全自動静的検証スクリプト
# AIが手動で構文チェックや検証を行う代わりに使用する

echo "Running static code checks..."

# bashスクリプトの構文チェック
echo "[1/2] Checking shell scripts syntax..."
for f in scripts/*.sh; do
  if [ -f "$f" ]; then
    bash -n "$f"
    if [ $? -ne 0 ]; then
      echo "❌ Syntax error found in $f"
      exit 1
    fi
  fi
done
echo "✅ Shell scripts syntax OK."

# pythonスクリプトのコンパイルチェック
echo "[2/2] Checking Python scripts syntax..."
if command -v python3 >/dev/null 2>&1; then
  python3 -m compileall -q scripts/
  if [ $? -ne 0 ]; then
    echo "❌ Syntax error found in Python scripts."
    exit 1
  fi
  echo "✅ Python scripts syntax OK."
else
  echo "⚠️ python3 command not found, skipping python checks."
fi

echo "All checks passed successfully."
exit 0
