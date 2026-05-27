#!/bin/bash
# setup_auto_sync.sh — 自動同期の有効化・無効化スクリプト
#
# 使い方：
#   有効化（初回・再有効化）: bash setup_auto_sync.sh install
#   無効化（一時停止）:       bash setup_auto_sync.sh uninstall
#   手動で今すぐ同期:         bash setup_auto_sync.sh sync

PLIST_LABEL="com.hayato.appsync"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"
SYNC_SCRIPT="/Users/sasakihayato/アプリ作成関連/アプリ作成/アプリ作成原本/scripts/sync_to_apps.py"
WATCH_PATH="/Users/sasakihayato/アプリ作成関連/アプリ作成/アプリ作成原本"

install_agent() {
    echo "📦 自動同期エージェントをインストールします..."

    # plist を生成
    cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>${SYNC_SCRIPT}</string>
    </array>
    <key>WatchPaths</key>
    <array>
        <string>${WATCH_PATH}</string>
    </array>
    <key>StandardOutPath</key>
    <string>/tmp/appsync.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/appsync_error.log</string>
    <key>RunAtLoad</key>
    <false/>
    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>
EOF

    # 既存エージェントをアンロード（エラーは無視）
    launchctl unload "$PLIST_PATH" 2>/dev/null

    # 新しいエージェントをロード
    launchctl load "$PLIST_PATH"

    echo "✅ 自動同期が有効になりました"
    echo "   監視対象: $WATCH_PATH"
    echo "   動作: アプリ作成原本のファイルが変更されると自動的に全アプリへ同期します"
    echo "   ログ: /tmp/appsync.log"
}

uninstall_agent() {
    echo "🛑 自動同期エージェントを停止します..."
    launchctl unload "$PLIST_PATH" 2>/dev/null
    rm -f "$PLIST_PATH"
    echo "✅ 自動同期を停止しました"
}

sync_now() {
    echo "🔄 手動同期を実行します..."
    python3 "$SYNC_SCRIPT"
}

case "$1" in
    install)
        install_agent
        ;;
    uninstall)
        uninstall_agent
        ;;
    sync)
        sync_now
        ;;
    *)
        echo "使い方:"
        echo "  bash setup_auto_sync.sh install    # 自動同期を有効化"
        echo "  bash setup_auto_sync.sh uninstall  # 自動同期を停止"
        echo "  bash setup_auto_sync.sh sync       # 今すぐ手動同期"
        ;;
esac
