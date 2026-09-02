-- ブックマークレットでXのタイムライン/プロフィールページから一括収集した投稿の
-- 一時的な置き場。ブラウザ（Xのページ）からのfetchで作成され、レビュー画面
-- （/post/bulk）が読み出して取り込みが終わったら削除する使い捨てのテーブル。

create table scrape_batches (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- レビューされずに放置されたバッチが延々残らないよう、作成日時で古いものを判別できるようにする
create index scrape_batches_created_at_idx on scrape_batches(created_at);
