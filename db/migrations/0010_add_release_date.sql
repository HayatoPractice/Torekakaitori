-- 商品の実際の発売日（カードの発売年月日）。年代別一覧表示に使う。
-- created_at はDBへの登録日時であり、発売日とは別物のため新設する。
ALTER TABLE products ADD COLUMN IF NOT EXISTS release_date DATE;
