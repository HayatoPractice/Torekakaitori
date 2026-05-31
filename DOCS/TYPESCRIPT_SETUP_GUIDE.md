# TypeScript 自動型チェック環境 — セットアップ記録と運用ガイド

作成日：2026-06-01
対象：アプリ作成原本 + 全アプリフォルダ（10個）

---

## ▌このドキュメントの目的

本ドキュメントは、TypeScript自動型チェック環境の構築過程を記録したものです。
セットアップ手順・発生した問題とその解決策・運用上の注意点を、
誰が読んでも同じ認識を持てるよう詳細に記載しています。

---

## ▌なぜTypeScriptを導入したか（背景と意図）

### ユーザーの発言（原文）
> 「TSで作成して、そこで完成したらJSに移すという方法の方が効率いいのではないのでしょうか。
> ミスをAIが探すよりもTsにミス探しを任せた方がトークン消費の節約になると思います」

### この考え方の正しさ
プロの開発現場でも同じ理由でTypeScriptが使われている。

```
❌ 非効率な流れ
  JSでコード → AIに「バグ探して」→ トークン消費

✅ 効率的な流れ
  TSでコード → tscが型エラーを即検出 → 自分で修正
            → AIには「型では検出できない設計・ロジック」だけ相談
```

**TypeScriptが自動で拾えるもの：**
- 存在しないプロパティへのアクセス
- 型の不一致（文字列を数値として使うなど）
- nullチェックの見落とし
- 関数の引数間違い

**これらをAIに聞く必要がなくなる → トークン節約・開発速度向上**

---

## ▌ファイル構成（セットアップ後）

```
アプリ作成原本/
├── tsconfig.json          ← 原本プロジェクト用（CommonJS/node/noEmit:false）
├── tsconfig.app.json      ← 各アプリ配布用（bundler/JSX/noEmit:true）
├── package.json           ← TypeScript devDependency
├── src/
│   └── types.ts           ← 型チェック起動用プレースホルダー
└── .vscode/
    ├── tasks.json         ← IDEを開くと自動でtsc --watchが起動する設定
    └── settings.json      ← 自動タスク実行許可 + ワークスペースTS設定

各アプリフォルダ/（sync_to_apps.py で自動配布）
├── tsconfig.json          ← tsconfig.app.json の内容がコピーされる
└── .vscode/
    ├── tasks.json         ← 自動型チェック設定
    └── settings.json      ← 自動タスク実行許可
```

---

## ▌セットアップ手順（再現手順）

### STEP 1：TypeScriptのインストール

```bash
npm install typescript --save-dev
```

**発生したエラーと対処：**
> `This is not the tsc command you are looking for`

→ TypeScriptが未インストールの状態で `npx tsc` を実行したため。
→ `npm install` で解決。

---

### STEP 2：tsconfig.json の作成

`npx tsc` を引数なしで実行するとヘルプが表示されるだけなので、
`tsconfig.json` を作成してプロジェクトの型チェック設定を定義する。

**原本プロジェクト用（tsconfig.json）：**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": false,
    "outDir": "./dist",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "build", ".next"]
}
```

**各アプリ配布用（tsconfig.app.json）：**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    ...
  }
}
```

**原本とアプリで設定が異なる理由：**

| 設定 | 原本（tsconfig.json） | 各アプリ（tsconfig.app.json） |
|------|----------------------|------------------------------|
| `module` | CommonJS | ESNext |
| `moduleResolution` | node | bundler |
| `jsx` | なし | react-jsx |
| `noEmit` | false（JS出力あり） | true（バンドラーに任せる） |
| 目的 | tscで直接コンパイル可能 | Vite/Next.js等との共存 |

---

### STEP 3：IDEを開いたら自動起動する設定

`.vscode/tasks.json`（既存ファイルを確認・活用）：
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "TypeScript Watch（型チェック）",
      "type": "shell",
      "command": "[ -f node_modules/.bin/tsc ] && npx tsc --noEmit --watch || echo '[TSC] TypeScript未インストール。npm install typescript --save-dev を実行してください'",
      "isBackground": true,
      "problemMatcher": "$tsc-watch",
      "runOptions": {
        "runOn": "folderOpen"
      },
      "presentation": {
        "reveal": "silent",
        "panel": "shared"
      }
    }
  ]
}
```

**ポイント：**
- `"runOn": "folderOpen"` → IDEを開くたびに自動実行
- `"isBackground": true` → バックグラウンドで静かに動く
- `--noEmit --watch` → JSを出力せず型チェックのみをリアルタイム監視
- TypeScript未インストール時のチェック追加（後述の問題対策）

`.vscode/settings.json`：
```json
{
  "task.allowAutomaticTasks": "on",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

**ポイント：**
- `"task.allowAutomaticTasks": "on"` → これがないと自動タスクがVSCodeにブロックされる
- `"typescript.tsdk"` → ワークスペースにインストールしたTypeScriptを優先使用

---

### STEP 4：型チェック起動用プレースホルダーの作成

`src/types.ts`：
```typescript
// プロジェクト共通の型定義ファイル
export {};
```

**発生したエラーと対処：**
> `error TS18003: No inputs were found in config file`

→ `.ts` ファイルが1つも存在しないと tsc が起動できない仕様のため。
→ `src/types.ts` を作成することで解決。
→ `export {}` は `isolatedModules: true` の要件を満たすために必要。

---

## ▌発生した問題と解決策（全6件）

### 問題1：`moduleResolution: "bundler"` がtsc直接コンパイルと非互換

**状況：** 初期設定で `moduleResolution: "bundler"` を使用していた。
**問題：** `bundler` はVite・webpack等のバンドラーツール専用の設定。
バンドラーなしで `tsc` だけでJSを出力しようとすると、
モジュール解決が正しく動作しない。

**解決策：** 原本の `tsconfig.json` を `moduleResolution: "node"` に変更。
各アプリ配布用の `tsconfig.app.json` はVite前提のため `bundler` を維持。

---

### 問題2：`jsx: "react-jsx"` が `@types/react` 未インストールでエラー

**状況：** 初期設定に `"jsx": "react-jsx"` が含まれていた。
**問題：** `react-jsx` は `@types/react` が必要。
原本プロジェクトにはReactがインストールされていないため、
`.tsx` ファイルにJSXを書くとエラーになる。

**解決策：** 原本の `tsconfig.json` から `jsx` 設定を削除。
Reactを使うアプリ向けの `tsconfig.app.json` では `react-jsx` を維持。

---

### 問題3：`include` パターンが意図しないファイルを拾う危険

**状況：** 初期設定に `"include": ["src/**/*", "**/*.ts", "**/*.tsx"]` があった。
**問題：**
- `src/**/*` と `**/*.ts` が重複（src内のtsファイルを二重に処理）
- `**/*.ts` は予期しない場所のTSファイルも対象にする

**解決策：** `"include": ["src/**/*"]` のみに限定。

---

### 問題4：`tsconfig.tsbuildinfo` がgitに混入する

**状況：** `incremental: true` を設定すると TypeScript がビルドキャッシュ
`tsconfig.tsbuildinfo` を自動生成する。
**問題：** このファイルはキャッシュファイルであり git 管理不要。
`.gitignore` に未登録だったため追跡されてしまう。

**解決策：** `.gitignore` に `*.tsbuildinfo` を追加。

---

### 問題5：`package.json` / `package-lock.json` が git 未追跡

**状況：** `npm install` で生成されたが git に追加していなかった。
**問題：** 他の環境（別のPC・チームメンバー）で `npm install` を実行しても
どのパッケージが必要か不明になる。

**解決策：** 両ファイルを `git add` して追跡対象に追加。

---

### 問題6：`.vscode/settings.json` が git 未追跡

**状況：** 自動タスク実行許可の設定ファイルが git 未追跡だった。
**問題：** 別の環境では `"task.allowAutomaticTasks": "on"` が反映されず、
IDEを開いても型チェックが自動起動しない。

**解決策：** `.vscode/settings.json` を `git add` して追跡対象に追加。

---

## ▌全アプリへの配布の仕組み

### ユーザーからの疑問（原文）
> 「これで一旦進めてください。気になることがあれば途中で質問します。」
> 「Gitpullしたら全てのアプリ作成フォルダに反映されるのでしょうか」

### 実際の仕組み

```
git pull（アプリ作成原本でのみ実行）
       ↓  post-merge フックが自動発火
       ↓  python3 scripts/sync_to_apps.py が実行される
       ↓
  全10アプリフォルダへ以下が自動配布：
  ・tsconfig.json（tsconfig.app.jsonの内容）
  ・.vscode/tasks.json
  ・.vscode/settings.json
  ・その他の共有ファイル（DOCS/*.md, AGENTS.md 等）
```

**重要：**
- `install_hooks.sh` は `アプリ作成原本` にだけ実行すれば良い（各アプリには不要）
- フックはすでにインストール済み → 今すぐ動く状態

### 各アプリに届くファイル一覧

| ファイル | 届く | 届かない理由 |
|---------|:----:|------------|
| tsconfig.json | ✅ | tsconfig.app.json の内容を上書きコピー |
| .vscode/tasks.json | ✅ | |
| .vscode/settings.json | ✅ | |
| DOCS/*.md（共有分） | ✅ | |
| AGENTS.md | ✅ | |
| GEMINI.md | ✅ | |
| scripts/*.py | ✅ | |
| CLAUDE.md | 条件付き | 固有セクションがあるアプリはスキップ |
| PROJECT_STATE.md | ❌ | プロジェクト固有データのため除外 |
| package.json | ❌ | 各アプリ独自の依存関係があるため |

---

## ▌TypeScript が検出できる範囲

### ユーザーからの疑問（原文）
> 「型チェックはこのフォルダの全てのコードファイルに反映されてチェックされるということですか」

### 答え：`.ts` / `.tsx` ファイルのみ

| ファイル種別 | 対象 |
|-------------|:----:|
| `.ts` / `.tsx` | ✅ |
| `.js` / `.jsx` | ❌ |
| `.py`（Python） | ❌ |
| `.sh`（Shell） | ❌ |
| `.md`（Markdown） | ❌ |

TypeScript は「TypeScript専用の型チェックツール」であり、
他言語のファイルは最初から対象外。

---

## ▌2種類の tsconfig の使い分け

| | tsconfig.json | tsconfig.app.json |
|---|---|---|
| 使う場所 | アプリ作成原本 | 各アプリ（配布先） |
| module | CommonJS | ESNext |
| moduleResolution | node | bundler |
| jsx | なし | react-jsx |
| noEmit | false | true |
| JS出力 | `dist/` に出力 | バンドラーが行う |
| 用途 | tscで直接コンパイル | React/Vite環境での型チェック |

### Reactアプリでjsxエラーが出た場合

`tsconfig.app.json` には `jsx: "react-jsx"` が入っているが、
アプリに `@types/react` がインストールされていない場合にエラーになることがある。
その場合は対象アプリで以下を実行：

```bash
npm install @types/react @types/react-dom --save-dev
```

---

## ▌推奨ワークフロー

```
1. src/ 以下に .ts ファイルを作成・編集する

2. tsc が自動でリアルタイム型チェック（バックグラウンド）
   → エラーがあれば Cmd+Shift+M で「問題」パネルに表示される

3. 型エラーは自分で修正（AIのトークン不要）

4. 完成したら npx tsc を実行
   → dist/ フォルダに JS ファイルが自動生成される

5. AIには「型では検出できない設計・ロジックバグ」だけ相談
```

---

## ▌各アプリでTypeScriptを有効にする手順

各アプリは `tsconfig.json` と `.vscode/` が届いているが、
TypeScript本体はアプリ側でインストールが必要。

```bash
# 対象アプリのフォルダで実行
npm install typescript --save-dev
```

インストール後は、IDEを開き直すと自動で型チェックが起動する。
（タスクに `node_modules/.bin/tsc` の存在チェックが入っているため、
 未インストールでも起動エラーにはならず、メッセージが表示される）

---

## ▌git未管理のアプリについて

`投資管理アプリ` / `短期トレードアプリ` は git 未管理。
**sync_to_apps.py はファイルコピーで動作するため、git がなくても届く。**
ただし、これらのアプリ自体のバージョン管理はされていない。

---

README.md v2.1 準拠 — 変更時は社長承認を得ること。
