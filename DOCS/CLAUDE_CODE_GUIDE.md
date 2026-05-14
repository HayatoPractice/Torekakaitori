# Claude Code 運用ガイド

Claude Codeのツール特性を最大限に引き出し、自律的な開発サイクルを確立するためのガイドラインです。

## 1. コア・サイクル (Research-Strategy-Execution-Validation)

Claude Codeは以下の4ステップを基本単位として動作します。

1.  **Research (調査):** `grep_search`, `glob`, `read_file` を駆使して既存コードと構造を把握。
2.  **Strategy (戦略):** 調査結果に基づき、具体的な変更箇所と手順を決定。
3.  **Execution (実行):** `replace`, `write_file` によるコード修正。
4.  **Validation (検証):** `run_shell_command` によるビルド、テスト、リンター実行。

## 2. Model Context Protocol (MCP) の活用

外部データソースとの接続（Google Drive, Jira, Slack等）が必要な場合、MCPサーバーを介してコンテキストを拡張します。最新の外部ドキュメントが必要な場合は、`web_fetch` を利用して動的に情報を取得します。

## 3. Skills & Hooks による自動化

-   **Skills:** 頻繁に使用する一連の操作（例：PR作成、デプロイ準備）をスクリプト化し、再利用可能な「スキル」として定義します。
-   **Hooks:** 特定のアクション（コミット前、テスト後など）に連動して自動実行されるシェルコマンドを設定し、品質を担保します。

## 4. コンテキスト効率化プロトコル

-   **サージカル・エディット:** ファイル全体を書き換えるのではなく、`replace` ツールで必要な箇所のみを最小限に変更します。
-   **並列処理:** 複数の独立した `read_file` や `run_shell_command` は、`wait_for_previous: false` を活用して並列実行し、時間を短縮します。
-   **検索の最適化:** `grep_search` の `include_pattern` を絞り込み、不要なファイル読み込みを避けます。

## 5. 自律運用の限界と承認

-   **自走:** tech_stack内の実装、ドキュメント更新、テスト実行は自律的に行います。
-   **承認必須:** 外部APIキーの発行、課金、本番環境へのデプロイ、破壊的なディレクトリ変更は必ず人間の承認を得ます。
