#!/bin/bash
# install_hooks.sh — Git フックのローカル登録スクリプト
#
# 【使い方】初回1回だけ実行する
#   bash scripts/install_hooks.sh
#
# 【インストールされるフック】
#   post-commit : git commit 完了後に全アプリへ即時同期
#   post-merge  : git pull 完了後に全アプリへ同期（バックアップ）
#
# 【launchd 方式からの移行】
#   旧 launchd 方式（com.hayato.appsync.plist）は廃止済みです。

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"

install_hook() {
    local hook_name="$1"
    local src="$REPO_ROOT/scripts/$hook_name"
    local dst="$REPO_ROOT/.git/hooks/$hook_name"

    if [ ! -f "$src" ]; then
        echo "⚠️  $src が見つかりません。スキップします。"
        return
    fi

    if [ -f "$dst" ]; then
        echo "⚠️  $hook_name フックはすでに登録されています。上書きします..."
    fi

    cp "$src" "$dst"
    chmod +x "$dst"
    echo "✅ $hook_name フックを登録しました"
}

install_hook "post-commit"
install_hook "post-merge"

echo ""
echo "【同期タイミング】"
echo "   git commit → post-commit フックが即座に全アプリへ同期"
echo "   git pull   → post-merge フックが全アプリへ同期（バックアップ）"
echo ""
echo "【注意】旧 launchd 方式（setup_auto_sync.sh）は廃止済みです。"
