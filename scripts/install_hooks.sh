#!/bin/bash
# install_hooks.sh — Git フックのローカル登録スクリプト
#
# 【使い方】初回1回だけ実行する
#   bash scripts/install_hooks.sh
#
# 【効果】
#   以降は git pull するたびに sync_to_apps.py が自動実行され
#   全アプリフォルダへ最新の共有ファイルが配布される
#
# 【launchd 方式からの移行】
#   旧 launchd 方式（com.hayato.appsync.plist）は廃止済みです。
#   移行は完了しています。setup_auto_sync.sh は削除済みです。

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_SRC="$REPO_ROOT/scripts/post-merge"
HOOK_DST="$REPO_ROOT/.git/hooks/post-merge"

# すでに登録済か確認
if [ -f "$HOOK_DST" ]; then
  echo "⚠️  post-merge フックはすでに登録されています: $HOOK_DST"
  echo "   上書きしますか？ [y/N]"
  read -r answer
  if [ "$answer" != "y" ] && [ "$answer" != "Y" ]; then
    echo "キャンセルしました"
    exit 0
  fi
fi

cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"

echo ""
echo "✅ post-merge フックを登録しました"
echo "   登録先: $HOOK_DST"
echo ""
echo "   次回から git pull するたびに全アプリへ自動同期されます"
echo ""
echo "【注意】旧 launchd 方式（setup_auto_sync.sh）は廃止済みです。"
echo "   現在の同期方式は Git post-merge フックに完全移行されています。"
