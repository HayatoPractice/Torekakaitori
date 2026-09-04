-- 2次流通価格を「個人間（フリマ）」「買取・シュリンク有」「買取・シュリンク無」の3系統に分離する。
-- 個人間相場は情報源がシュリンク有無を区別しないため単一値、買取は有無で別値を持てるようにする。
ALTER TABLE products ADD COLUMN IF NOT EXISTS secondary_market_price_individual INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS secondary_market_trend_individual TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS secondary_market_price_buyback_shrink INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS secondary_market_trend_buyback_shrink TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS secondary_market_price_buyback_noshrink INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS secondary_market_trend_buyback_noshrink TEXT;

-- 旧・単一項目（secondary_market_price / secondary_market_trend）は
-- 買取・シュリンク有側へ引き継いだ上で廃止した（本番では手動で個別に再分類・削除済み）
ALTER TABLE products DROP COLUMN IF EXISTS secondary_market_price;
ALTER TABLE products DROP COLUMN IF EXISTS secondary_market_trend;
