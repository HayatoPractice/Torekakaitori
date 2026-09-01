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

# INC-035はBasic認証撤廃（2026-09-01、src/proxy.ts削除）によりguard.mjs側で除外済みのため、
# ここでの確認も対象外にした。

# INC-069はsrc/の変更ではなくgit remoteの状態を見る検査のため、専用の壊し方で確認する。
# originを退避してから検査し、必ず元に戻す（restoreを先に書き、途中で失敗しても残らないようにする）。
check_inc069() {
  local had_origin
  had_origin=$(git remote | grep -x origin || true)
  if [ -z "$had_origin" ]; then
    printf "  スキップ    INC-069     originが無いため確認不可\n"
    return
  fi
  # 現状（origin=app-template）で検知できるか
  if node scripts/guard.mjs 2>&1 | grep -q "❌ INC-069"; then r1="✅ 捕まえた"; else r1="❌ 見逃した"; fi
  printf "  %s  %-10s %s\n" "$r1" "INC-069" "originが共有テンプレートを指している状態を検知"
  # originを退避した状態で誤検知しないか（restoreを先に登録し、途中終了でも必ず戻す）
  trap 'git remote rename origin_selftest_bak origin 2>/dev/null || true' RETURN
  git remote rename origin origin_selftest_bak
  if node scripts/guard.mjs 2>&1 | grep -q "❌ INC-069"; then r2="❌ 誤検知した"; else r2="✅ 正常時は無害"; fi
  printf "  %s  %-10s %s\n" "$r2" "INC-069" "originが無い/別物のときに誤検知しないか"
}
check_inc069

echo ""
