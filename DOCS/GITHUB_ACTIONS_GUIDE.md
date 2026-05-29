# GITHUB_ACTIONS_GUIDE.md — GitHub Actions 自動化パターン集
# 読込タイミング：CI/CD設計時 / 新プロジェクト開始時 / セキュリティ設計時
# 更新者：秘書チーム ｜ 更新タイミング：新パターン追加・ツールバージョン更新時

---

## ▌このファイルの役割

SERVICE_ORG_CORE.md §CI/CD が「何をすべきか（ルール）」を定義しているのに対し、
本ファイルは「どう実装するか（YAML）」を提供する。コピー&ペーストして即使える。

> 関連：MASTER_LESSONS.md ML-010「自動テストはPlaywright + GitHub Actionsで本番反映前に必ず通す」

---

## §1 ファイル配置と使い方

```
プロジェクトルート/
└── .github/
    └── workflows/
        ├── ci.yml              ← §2 + §3（品質チェック + テスト。基本はこれだけでOK）
        ├── dependency-check.yml ← §4（週次バージョン確認）
        └── security.yml        ← §5（セキュリティスキャン）
```

**運用方針（SERVICE_ORG_CORE.md §CI/CD より）：**
- コアロジックへの変更 → CI必須
- UIだけの変更 → CI推奨
- DOCSのみの変更 → CI省略可

---

## §2 コード品質チェック（Lint・型チェック）

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    name: Lint & Type Check
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # TypeScript 型チェック（エラーがあればCIが止まる）
      - name: Type check
        run: npx tsc --noEmit

      # ESLint（警告はスルー・エラーのみブロック）
      - name: Lint
        run: npx eslint . --ext .ts,.tsx --max-warnings=0
```

**ポイント：**
- `npm ci` は `npm install` より高速・決定論的（lockファイルを厳密に使う）
- `--max-warnings=0` で警告もエラー扱いにして品質を保つ
- `actions/setup-node` の `cache: 'npm'` で node_modules をキャッシュして高速化

---

## §3 テスト自動実行（Vitest + Playwright）

```yaml
# §2 の ci.yml に追記する（同一ファイルに jobs を追加）

  unit-test:
    name: Unit Tests (Vitest)
    runs-on: ubuntu-latest
    needs: quality          # Lint通過後にのみ実行

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npx vitest run --reporter=verbose

  e2e-test:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    needs: unit-test         # ユニットテスト通過後にのみ実行

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npx playwright test

      # テスト失敗時のスクリーンショット・動画をアーティファクトに保存
      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

**ポイント：**
- `needs:` でジョブを直列化（Lint → Unit → E2E の順）
- 失敗時のみアーティファクトを保存して調査できるようにする
- Playwright は `chromium` だけに絞ると実行時間を短縮できる

---

## §4 ライブラリの定期バージョン確認（Dependabot）

Dependabot は GitHub の設定ファイルを置くだけで有効になる。GitHub Actions のワークフローは不要。

```yaml
# .github/dependabot.yml（プロジェクトルート直下の .github/ に置く）
version: 2

updates:
  # npm パッケージの自動更新PR
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"      # 毎週月曜に確認
      day: "monday"
      time: "09:00"
      timezone: "Asia/Tokyo"
    open-pull-requests-limit: 5  # 同時に開くPRの上限
    labels:
      - "dependencies"
    ignore:
      # メジャーバージョンアップは自動PRしない（破壊的変更リスク）
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]

  # GitHub Actions 自体のバージョン更新
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

**ポイント：**
- メジャーバージョンアップは自動PRしない設定が安全（ML-004 参照）
- Dependabot が出したPRは CI が自動で走るため、テストが通れば安心してマージできる
- `open-pull-requests-limit: 5` で PR が溢れないよう制限する

---

## §5 セキュリティスキャン（CVE検出）

### 5-1. npm audit（依存関係の脆弱性チェック）

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 9 * * 1'    # 毎週月曜9時（JST）に定期実行

jobs:
  npm-audit:
    name: npm audit
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # high・critical の脆弱性があればCIを失敗させる
      - name: Run npm audit
        run: npm audit --audit-level=high
```

### 5-2. GitHub CodeQL（コード自体の脆弱性分析）

```yaml
# security.yml に追記
  codeql:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    permissions:
      security-events: write   # セキュリティアラートの書き込み権限

    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript  # TypeScript も javascript で対応

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
```

**ポイント：**
- `npm audit --audit-level=high` で high 以上のみブロック（low/moderate は警告のみ）
- CodeQL は GitHub が無料で提供するSAST（静的解析）ツール。SQLインジェクション・XSS等を検出
- セキュリティアラートは GitHub の「Security」タブで確認できる

---

## §6 全パターン組み合わせ時のジョブ実行順序

```
push/PR
  │
  ├─→ quality（Lint + 型チェック）
  │       │
  │       └─→ unit-test（Vitest）
  │                 │
  │                 └─→ e2e-test（Playwright）
  │
  └─→ npm-audit（セキュリティ）
  └─→ codeql（コード解析）※並列
```

**所要時間の目安：**
| ジョブ | 目安時間 |
|---|---|
| Lint + 型チェック | 1〜2分 |
| Vitest ユニットテスト | 1〜3分 |
| Playwright E2E | 3〜10分 |
| npm audit | 30秒 |
| CodeQL | 5〜15分 |

---

## §7 シークレット管理（GitHub Actions で外部APIを使う場合）

```yaml
# NG：直接書かない
- name: Deploy
  run: vercel deploy --token=abc123xyz  # 絶対NG

# OK：GitHub Secrets を参照する
- name: Deploy
  env:
    VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
  run: vercel deploy --token=$VERCEL_TOKEN
```

**設定場所：** GitHub リポジトリ → Settings → Secrets and variables → Actions

---

GITHUB_ACTIONS_GUIDE.md v1.0 — CI/CDパターン実装ガイド。SERVICE_ORG_CORE.md §CI/CD の実装版。
