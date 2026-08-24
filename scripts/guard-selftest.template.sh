#!/bin/bash
#
# guard-selftest.sh — 検査そのものが本当に働くかを確かめる（全アプリ共通の雛形／INC-058）
#
# 【なぜ必要か】
# 検査は「書いた」だけでは意味がない。実際に壊してみて捕まえられなければ、
# 守られていないのに守られているように見える、最も危険な状態になる。
#
# 実際、guard.mjs に書き下ろした12件の検査のうち3件は見逃していた。
#   ・INC-009 … import が残っているだけで合格していた（呼んでいるかを見ていなかった）
#   ・INC-026 … 書き出し側にだけ表が出ていれば合格していた（控えは取れないのに）
#   ・（別件）… 引用符の違い（' と "）で、書いた直後から一度も働いていなかった
# どれも、この自己テストを走らせるまで気づけなかった。
#
# 【重要：guard.mjs としては配布しない。guard.template.mjs と同じ理由】
# 「壊し方」はアプリのソースコードに具体的に依存する（ファイルパス・関数名・変数名）。
# このファイルはそのままでは動かない。各アプリでコピーし、下の check 呼び出しを
# そのアプリの実際のコード（ファイルパス・置換対象）に書き換えてから使うこと。
#
# 【使い方】
#   cp scripts/guard-selftest.template.sh scripts/guard-selftest.sh
#   # 下の check 行を、このアプリの guard.mjs の CHECKS・実際のソースに合わせて書き換える
#   bash scripts/guard-selftest.sh
#
# 【決まり】
# guard.mjs の CHECKS に検査を1件足したら、ここにも対応する「わざと壊す1行」を
# 同時に足すこと（後回し禁止）。壊し方は必ず元に戻すので、作業中のファイルは変わらない。
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

# ────────────────────────────────────────────────────────────────
# ここから下は「例」。そのままでは対象ファイルが存在せず動かない。
# このアプリの guard.mjs の CHECKS に対応させて、壊し方を書き換えること。
#
# check "画面が res.json() を直呼び"        "sed -i '' 's|readJson(res)|res.json()|' src/xxx.ts"        "INC-052"
# check "変換中の判定を外す"                "sed -i '' 's|isImeComposing(e)|false|g' src/xxx.tsx"      "INC-009"
# check "AIのAPIから認証を外す"             "sed -i '' 's|isRequestAllowed|__off|g' src/app/api/xxx/route.ts" "INC-031"
# check "DBのキャッシュ無効化を外す"        "sed -i '' \"s|'no-store'|'default'|\" src/lib/db.ts"       "INC-008"
# check "proxy.ts を旧名に戻す"             "mv src/proxy.ts src/middleware.ts"                          "INC-035"
# check "控えから表を1つ落とす"             "sed -i '' 's|<表名>|<表名>_XXX|g' src/lib/backup.ts"        "INC-026"
# check "サーバーでその場の日付を使う"      "sed -i '' 's|toDayKeyInZone(x)|x.toISOString().slice(0,10)|' src/lib/xxx.ts" "INC-033"
# ────────────────────────────────────────────────────────────────

echo ""
