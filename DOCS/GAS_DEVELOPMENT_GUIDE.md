# GAS_DEVELOPMENT_GUIDE.md — Google Apps Script 開発完全ガイド

対象：隼（Hayato）
層：🔄 随時更新層（GASの仕様変更・新パターン発見時に更新）
用途：GASアプリ開発時に参照する専用ガイド。GASプロジェクト開始時に必ず読む
読込タイミング：GASアプリの新規作成・既存GASの編集・デバッグ時

> **GAS とWebアプリの選択基準：**
> 基本は Web アプリ（React/Next.js）を採用。
> 以下の条件でユーザーが指定した場合のみ GAS を選択する：
> - スプレッドシートとの密な連携が必要
> - 自分だけが使う簡単な自動化ツール
> - Google Workspace（Gmail・Drive・Calendar）との統合が中心

---

## SECTION 1：デプロイモデルの選択

GAS には4つのデプロイモデルがある。プロジェクト開始時に必ず選択する。

| モデル | 用途 | 特徴 |
|---|---|---|
| **スタンドアロン** | 独立した自動化スクリプト・バッチ処理 | 時間トリガーが使える。シートに縛られない |
| **コンテナバインド** | スプレッドシート/ドキュメント/フォームに紐づく | onEdit等のシンプルトリガーが使える。対象ファイルと一体 |
| **WebApp** | ブラウザからアクセスするUI付きツール | doGet/doPost でリクエストを受け付ける。URLを発行 |
| **ライブラリ** | 複数のGASから共有するコード | `ScriptApp.getActiveUserLocale()` 等で呼び出す |

**選択フロー：**
```
スプレッドシート操作 + onEdit が必要 → コンテナバインド
UIが必要（フォーム等） → WebApp
定期実行・外部API連携のみ → スタンドアロン
複数GASで同じコードを使い回す → ライブラリ
```

---

## SECTION 2：clasp 開発ワークフロー

### 2-1. 初期セットアップ

```bash
# clasp のインストール（グローバル）
npm install -g @google/clasp

# Google アカウントでログイン
clasp login

# TypeScript プロジェクトの新規作成
mkdir my-gas-project && cd my-gas-project
clasp create --title "プロジェクト名" --type standalone
# --type の選択肢: standalone / sheets / docs / forms / slides / webapp / api

# または既存プロジェクトをクローン
clasp clone <scriptId>
```

### 2-2. TypeScript 設定

```bash
# 必須パッケージのインストール
npm init -y
npm install --save-dev @types/google-apps-script typescript

# tsconfig.json
{
  "compilerOptions": {
    "lib": ["esnext"],
    "experimentalDecorators": true,
    "target": "ES2019"
  }
}
```

### 2-3. .clasp.json の設定

```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "./src",
  "filePushOrder": ["globals.ts", "utils.ts", "main.ts"]
}
```

### 2-4. appsscript.json（必須）

```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly"
  ]
}
```

> ⚠️ `oauthScopes` は使う権限のみを列挙する（最小権限の原則）。
> 全権限を付与する `...auth/drive` より `...auth/drive.readonly` を使う。

### 2-5. 日常のワークフロー

```bash
# ローカルのコードをGASに反映
clasp push

# GASのコードをローカルに取得
clasp pull

# GASエディタをブラウザで開く
clasp open

# バージョンを作成して公開（WebApp の場合）
clasp deploy --description "v1.0 リリース"
```

---

## SECTION 3：実行時間・クォータ制限

### 3-1. 実行時間の壁

| アカウント種別 | 最大実行時間 |
|---|---|
| 無料（gmail.com） | **6分/実行** |
| Google Workspace | **30分/実行** |

### 3-2. 主要クォータ制限（1日あたり）

| サービス | 無料アカウント | Workspace |
|---|---|---|
| MailApp.sendEmail | **100通** | **1,500通** |
| UrlFetchApp.fetch | 20,000回 | 100,000回 |
| スプレッドシートAPI | 制限なし（スロットリングあり） | 同左 |
| DriveApp ファイル作成 | 最大15GB（ストレージ） | 容量による |

### 3-3. 長時間処理の分割（ContinuationToken パターン）

6分の壁に当たる長時間処理は PropertiesService で状態を保存して分割する：

```typescript
function processLargeData() {
  const MAX_RUNTIME_MS = 5 * 60 * 1000; // 5分で停止（1分の余裕を持つ）
  const startTime = Date.now();
  
  const props = PropertiesService.getScriptProperties();
  let startRow = parseInt(props.getProperty('startRow') || '2');
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();
  
  for (let row = startRow; row <= lastRow; row++) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) {
      // 時間切れ → 続きを記録してトリガーで再開
      props.setProperty('startRow', String(row));
      ScriptApp.newTrigger('processLargeData')
        .timeBased()
        .after(60 * 1000) // 1分後に再実行
        .create();
      return;
    }
    
    // 処理本体
    processRow(sheet, row);
  }
  
  // 完了：状態をリセット
  props.deleteProperty('startRow');
  console.log('全処理完了');
}
```

---

## SECTION 4：パフォーマンス最適化

### 4-1. バッチ処理（最重要）

GAS最大の落とし穴：ループ内でスプレッドシートを個別に読み書きすると**非常に遅い**。

```typescript
// ❌ NG：ループ内の個別読み書き（100行で数分かかる）
for (let i = 1; i <= 100; i++) {
  const value = sheet.getRange(i, 1).getValue(); // 1回のAPI呼び出し
  sheet.getRange(i, 2).setValue(value * 2);       // 1回のAPI呼び出し
}

// ✅ OK：一括読み込み → 処理 → 一括書き込み（1秒未満）
const data = sheet.getRange(1, 1, 100, 1).getValues(); // 1回のみ
const results = data.map(([value]) => [value * 2]);
sheet.getRange(1, 2, 100, 1).setValues(results);        // 1回のみ
```

### 4-2. CacheService（繰り返しAPI呼び出しの削減）

```typescript
function getCachedData(key: string): string | null {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);
  
  if (cached) return cached; // キャッシュがあれば即返す
  
  // API呼び出し（重い処理）
  const result = fetchFromExternalAPI(key);
  
  cache.put(key, result, 300); // 5分間キャッシュ
  return result;
}
```

### 4-3. SpreadsheetApp.flush()

```typescript
// 大量の書き込み後は flush() で確実に反映させる
sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
SpreadsheetApp.flush(); // バッファをフラッシュ（特にUI表示がある場合に重要）
```

---

## SECTION 5：トリガー設計

### 5-1. シンプルトリガー vs インストーラブルトリガー

| 項目 | シンプルトリガー | インストーラブルトリガー |
|---|---|---|
| 設定方法 | 関数名を `onEdit` 等の予約名にするだけ | ScriptApp.newTrigger() で作成 |
| UrlFetchApp | **使用不可** | 使用可 |
| 実行権限 | 閲覧者でも発火する | スクリプト所有者の権限で実行 |
| 対応イベント | onEdit / onOpen / onFormSubmit | 上記 + 時間ベース |

```typescript
// シンプルトリガー（スプレッドシート編集時に自動実行）
function onEdit(e: GoogleAppsScript.Events.SheetsOnEdit) {
  // ⚠️ここではUrlFetchApp.fetch()は使えない
  const range = e.range;
  console.log(`編集: ${range.getA1Notation()}`);
}

// インストーラブルトリガーの作成（スクリプトを一度手動実行して登録）
function createTriggers() {
  // 毎日AM8時に実行
  ScriptApp.newTrigger('dailyReport')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .inTimezone('Asia/Tokyo')
    .create();
  
  // スプレッドシート編集時（UrlFetchApp 使用可能版）
  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
}
```

### 5-2. LockService（並列実行防止）

時間トリガーが重複実行されるとデータが壊れる場合に使う：

```typescript
function criticalProcess() {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30 * 1000); // 30秒待機（タイムアウトすれば例外）
    
    // クリティカルセクション（同時実行されては困る処理）
    doImportantWork();
    
  } catch (e) {
    console.error('ロック取得失敗（別のインスタンスが実行中）:', e);
  } finally {
    lock.releaseLock();
  }
}
```

---

## SECTION 6：HtmlService（WebApp UI）

### 6-1. 基本構成

```typescript
// main.gs.ts
function doGet(e: GoogleAppsScript.Events.DoGet) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('アプリ名')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// サーバー側関数（クライアントから呼び出す）
function saveData(data: { name: string; value: number }) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([new Date(), data.name, data.value]);
  return { success: true };
}
```

### 6-2. クライアント側（index.html）

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
</head>
<body>
  <input id="name" type="text" placeholder="名前" />
  <button onclick="handleSave()">保存</button>
  <div id="status"></div>

  <script>
    function handleSave() {
      const name = document.getElementById('name').value;
      
      // google.script.run でサーバー側の関数を呼ぶ
      google.script.run
        .withSuccessHandler(function(result) {
          // ✅ 成功ハンドラ（必須）
          document.getElementById('status').textContent = '保存しました';
        })
        .withFailureHandler(function(error) {
          // ❌ 失敗ハンドラ（必須・省略禁止）
          document.getElementById('status').textContent = 'エラー: ' + error.message;
        })
        .saveData({ name: name, value: 42 }); // サーバー側の関数を呼ぶ
    }
  </script>
</body>
</html>
```

> ⚠️ `withFailureHandler` の省略は禁止。エラーが発生してもユーザーに伝わらない。

---

## SECTION 7：エラーハンドリングとログ・通知

### 7-1. GAS のエラー通知パターン

GAS の `throw` はユーザーのブラウザに表示されない（WebApp の場合）。
エラーをユーザーに知らせるには **メール通知** が必要：

```typescript
function sendErrorNotification(error: Error, context: string) {
  const OWNER_EMAIL = PropertiesService.getScriptProperties()
    .getProperty('OWNER_EMAIL');
  
  MailApp.sendEmail({
    to: OWNER_EMAIL,
    subject: `[エラー] GASスクリプト: ${context}`,
    body: [
      `エラー発生時刻: ${new Date().toLocaleString('ja-JP')}`,
      `コンテキスト: ${context}`,
      `エラー: ${error.message}`,
      `スタックトレース: ${error.stack}`,
    ].join('\n'),
  });
}

// 全ての主要関数に try/catch を実装
function dailyReport() {
  try {
    generateReport();
  } catch (e) {
    console.error('dailyReport failed:', e);
    sendErrorNotification(e as Error, 'dailyReport');
  }
}
```

### 7-2. ログの使い分け

| ログ方法 | 用途 | 確認方法 |
|---|---|---|
| `console.log()` | 開発中のデバッグ | GASエディタの「実行ログ」 |
| `Logger.log()` | 廃止予定・非推奨 | 同上（console.logを使う） |
| `console.error()` | エラーログ（本番含む） | GASエディタ + Cloud Logging |
| Cloud Logging | 本番の詳細ログ | GCP Console → Cloud Logging |

---

## SECTION 8：テスト戦略

### 8-1. ステージング環境パターン

```typescript
// 本番と開発でスプレッドシートを分ける
function getTargetSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const props = PropertiesService.getScriptProperties();
  const mode = props.getProperty('MODE') || 'development';
  
  const SHEET_IDS = {
    production: props.getProperty('PROD_SHEET_ID'),
    development: props.getProperty('DEV_SHEET_ID'),
  };
  
  const sheetId = SHEET_IDS[mode as keyof typeof SHEET_IDS];
  return SpreadsheetApp.openById(sheetId!).getActiveSheet();
}
```

### 8-2. clasp + Jest（TypeScript環境）

```bash
# テスト環境のセットアップ
npm install --save-dev jest @types/jest ts-jest

# jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // GASのグローバルオブジェクトをモック
    'googleapis': '<rootDir>/__mocks__/googleapis.ts',
  },
};
```

### 8-3. 手動テストの手順

```
1. DEV_SHEET_ID に開発用シートを設定
2. PropertiesService で MODE=development を設定
3. GASエディタで対象関数を選択して「実行」
4. 実行ログで結果を確認
5. 開発用シートで出力内容を確認
6. OK なら MODE=production に切り替えて本番テスト
```

---

## SECTION 9：環境変数・シークレット管理

### 9-1. PropertiesService の分類

```typescript
// スクリプトプロパティ（全ユーザー共通）
const scriptProps = PropertiesService.getScriptProperties();
const API_KEY = scriptProps.getProperty('GEMINI_API_KEY');

// ユーザープロパティ（ユーザーごとに異なる設定）
const userProps = PropertiesService.getUserProperties();
const userPref = userProps.getProperty('NOTIFICATION_EMAIL');

// ドキュメントプロパティ（コンテナバインドのみ）
const docProps = PropertiesService.getDocumentProperties();
```

### 9-2. GAS WebApp + React/Vite 連携時の環境変数分離

GAS WebApp のフロント（React+Vite でビルドした HTML）と GAS サーバーで変数を分ける：

```typescript
// フロント（Vite でビルドする場合）
// .env.local に書く
VITE_PUBLIC_APP_TITLE=マイアプリ

// GAS サーバーサイドのシークレット
// PropertiesService に設定（.env に書かない）
// → スクリプトプロパティ: GEMINI_API_KEY, MAIN_SHEET_ID 等

// GAS WebApp から React に変数を渡す場合
function getClientConfig() {
  return {
    // 公開してよい設定のみ返す（APIキーは渡さない）
    appTitle: PropertiesService.getScriptProperties().getProperty('APP_TITLE'),
  };
}
```

---

## SECTION 10：セキュリティ

### 10-1. WebApp の認証

```typescript
function doGet(e: GoogleAppsScript.Events.DoGet) {
  // Googleアカウントでのログイン必須にする場合
  const user = Session.getActiveUser();
  const email = user.getEmail();
  
  if (!email) {
    return HtmlService.createHtmlOutput('<p>ログインが必要です</p>');
  }
  
  // 許可リストによるアクセス制限
  const ALLOWED_USERS = PropertiesService.getScriptProperties()
    .getProperty('ALLOWED_EMAILS')?.split(',') || [];
  
  if (!ALLOWED_USERS.includes(email)) {
    return HtmlService.createHtmlOutput('<p>アクセス権限がありません</p>');
  }
  
  return HtmlService.createHtmlOutputFromFile('index');
}
```

### 10-2. OAuthスコープの最小権限

```json
// appsscript.json
{
  "oauthScopes": [
    // NG: 全Drive権限（危険）
    // "https://www.googleapis.com/auth/drive",
    
    // OK: 必要な権限のみ
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/script.send_mail"
  ]
}
```

---

GAS_DEVELOPMENT_GUIDE.md v1.0 — 🔄随時更新層。GASの仕様変更・新パターン発見時に更新すること。
読込タイミング：GASプロジェクトの新規作成・既存GASの編集・デバッグ時
