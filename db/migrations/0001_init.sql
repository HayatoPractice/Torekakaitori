-- トレカ相場確認アプリ 初期スキーマ（Neon / Postgres）
-- 認証なし・単一ユーザー運用が前提のため、サーバー側APIからDATABASE_URLで直接接続する。

create extension if not exists "pgcrypto";

-- 対象Xアカウント（トレカ販売店・買取店など）
create table accounts (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,           -- 例: @example_shop（先頭の@は含めない運用でも可）
  display_name text not null,
  notes text,
  created_at timestamptz not null default now()
);

-- 商品マスタ（BOX/パックの正規名。表記ゆれを吸収するための名寄せ先）
create table products (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  item_type text not null default 'box' check (item_type in ('box', 'pack', 'other')),
  created_at timestamptz not null default now()
);

-- 商品の表記ゆれ（エイリアス）
create table product_aliases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  alias_text text not null unique,
  created_at timestamptz not null default now()
);

-- ユーザーが手動投入した投稿（URL / テキスト / 画像）
create table posts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  posted_date date not null,             -- 投稿日（画像から自動抽出できなければ手入力）
  source_url text,                       -- 任意。X投稿URLなど
  raw_text text,                         -- 貼り付けたテキスト（複数投稿分をまとめて貼った生データ）
  content_hash text,                     -- raw_text + 画像バイト列のハッシュ。厳密一致の重複検知に使う
  status text not null default 'pending' check (status in ('pending', 'processed', 'error')),
  error_message text,
  created_at timestamptz not null default now()
);

-- URLがある投稿は同一URLの重複登録をDBレベルで防ぐ（nullは対象外）
create unique index posts_source_url_unique on posts(source_url) where source_url is not null;
create index posts_account_date_idx on posts(account_id, posted_date);
create index posts_content_hash_idx on posts(content_hash) where content_hash is not null;

-- 投稿に添付された画像（NeonにはSupabase Storageのようなファイル置き場が無いため、
-- 画像本体をbyteaとしてDBに直接保存する。個人利用の画像枚数・サイズ想定では十分実用的）
create table post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  data bytea not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

-- AI（Gemini）が投稿から抽出した価格アイテム
create table extracted_items (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade, -- 集計クエリ高速化のための非正規化
  product_id uuid references products(id) on delete set null,
  product_name_raw text not null,        -- AIが読み取った生の商品名（正規化前）
  item_type text not null default 'box' check (item_type in ('box', 'pack', 'other')),
  price_type text not null check (price_type in ('sell', 'buy')),
  price integer not null check (price >= 0),
  confidence numeric(3,2) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  review_status text not null default 'pending_review'
    check (review_status in ('confirmed', 'pending_review', 'rejected')),
  created_at timestamptz not null default now()
);

create index extracted_items_post_idx on extracted_items(post_id);
create index extracted_items_account_idx on extracted_items(account_id);
create index extracted_items_product_idx on extracted_items(product_id);
create index extracted_items_review_status_idx on extracted_items(review_status);
