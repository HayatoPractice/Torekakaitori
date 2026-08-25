# トレカ相場確認アプリ

Xの複数アカウント（トレカ販売店・買取店）の投稿を手動で登録すると、AI（Gemini）が
BOX/パック単位の価格情報を自動抽出し、店舗ごとの販売相場・買取相場を横断比較できるアプリ。

詳しい要件・設計判断の経緯は `DOCS/REQUIREMENTS_LOG.md` を参照。

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Neonプロジェクトを用意する

1. https://neon.tech でプロジェクトを新規作成（無料枠でOK）
2. ダッシュボードの Connection String（`postgresql://...`）を控える
3. SQL Editor（またはNeon CLI／`psql`）で `db/migrations/0001_init.sql` の内容を実行する
   （テーブル一式が作成される。投稿画像はNeonにファイルストレージが無いため、DBに
   bytea（バイナリ）として直接保存する設計にしている）

### 3. Gemini APIキーを取得する

https://aistudio.google.com/apikey で無料のAPIキーを発行する。

### 4. 環境変数を設定する

```bash
cp .env.local.example .env.local
```

`.env.local` を開き、`DATABASE_URL` / `GEMINI_API_KEY` を埋める。

### 5. 起動

```bash
npm run dev
```

http://localhost:3000 を開く。

## 使い方の流れ

1. 「アカウント管理」で追跡したいXアカウントを登録する
2. 「投稿を登録」で、投稿URL（任意）・テキスト・画像のいずれか（複数可）を貼り付けて登録する
   （X自体からの自動取得は行わない。詳細は `DOCS/REQUIREMENTS_LOG.md` の前提・制約を参照）
3. AIが自動でBOX/パック名・価格・種別（販売/買取）を抽出する
4. 確信度が低い抽出結果は「レビュー待ち」に入るので、「レビュー待ち」画面で確認・修正・確定する
5. 「日別に見る」でその日の全投稿を横断確認、「商品・相場比較」で価格推移・店舗ランキングを確認する
6. 「ブックマークレット」をブラウザに登録すると、X閲覧中に投稿URLをワンクリックで取り込める

## 開発時の品質チェック

```bash
npm run lint
npx tsc --noEmit
npm run guard          # 過去のインシデントの再発を機械的に検査する
```
