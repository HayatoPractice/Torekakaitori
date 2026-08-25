#!/bin/bash
#
# guard-selftest.sh — 検査そのものが本当に働くかを確かめる（トレカ相場確認アプリ）
# 使い方: npm run guard:selftest
#
set -e
cd "$(dirname "$0")/.."

# $1=説明 $2=壊すコマンド $3=期待するINC（guard.mjs の出力に "❌ INC-XXX" が出るか確認する）
check() {
  cp -r src /tmp/guard_selftest_src_bak
  eval "$2" >/dev/null 2>&1
  if node scripts/guard.mjs 2>&1 | grep -q "❌ $3"; then r="✅ 捕まえた"; else r="❌ 見逃した"; fi
  rm -rf src && mv /tmp/guard_selftest_src_bak src
  printf "  %s  %-10s %s\n" "$r" "$3" "$1"
}

echo ""
echo "検査そのものが本当に働くかを確かめます（npm run guard:selftest）"
echo ""

check "画面が res.json() を直呼び" \
  "sed -i '' 's|await readJson(res)|await res.json()|' src/app/items/page.tsx" \
  "INC-052"

check "アンダースコアフォルダにroute.tsを置く" \
  "mkdir -p src/app/api/_hidden && printf 'export function GET() { return new Response(\"x\"); }\n' > src/app/api/_hidden/route.ts" \
  "INC-053"

check "APIルートからforce-dynamicを外す" \
  "sed -i '' '/export const dynamic = .force-dynamic.;/d' src/app/api/accounts/route.ts" \
  "INC-008"

check "GeminiのタイムアウトをmaxDuration以上にする" \
  "sed -i '' 's|GEMINI_TIMEOUT_MS = 45000|GEMINI_TIMEOUT_MS = 65000|' src/lib/gemini.ts" \
  "INC-051"

echo ""
