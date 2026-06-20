---
description: SESSION_LOG.md をキーワードで検索して該当エントリを表示する
---

SESSION_LOG.md をキーワード「$ARGUMENTS」で検索してください。

## 検索手順

### Step 1：プロジェクト個別ログを検索

```bash
grep -n "$ARGUMENTS" SESSION_LOG.md 2>/dev/null || echo "SESSION_LOG.md が見つかりません（このプロジェクトはまだ SESSION_LOG を作成していない可能性があります）"
```

### Step 2：検索結果の表示

- ヒットした行番号を確認し、前後5行のコンテキストを含めて表示する
- タグでフィルタリングする場合は以下のように再検索する：

```bash
grep -n "\[DECISION\]" SESSION_LOG.md   # 重要決定の一覧
grep -n "\[BUG:OPEN\]" SESSION_LOG.md   # 未解決バグ一覧
grep -n "\[BUG:RESOLVED\]" SESSION_LOG.md  # 解決済みバグ一覧
grep -n "\[MILESTONE\]" SESSION_LOG.md  # マイルストーン一覧
```

### Step 3：関連エントリのサマリー

検索結果の中から、キーワードに関連する決定事項・解決済みバグ・注意点をまとめて報告する。
結果が多い場合は日付が新しいものから順に表示する。

**使用例：**
- `/session:search Supabase` → Supabase に関する過去の決定を確認
- `/session:search [BUG:RESOLVED]` → 解決済みバグ一覧を表示
- `/session:search 認証` → 認証まわりの過去のやり取りを検索
- `/session:search [DECISION]` → 重要な設計判断の一覧を表示
