-- 2次流通価格の推移を記録する。発売当初からの過去データは情報源側に存在しないため
-- 遡って復元することはできないが、今後の更新のたびに1行ずつ記録し、この記録開始日からの
-- 推移を追えるようにする。
CREATE TABLE IF NOT EXISTS secondary_market_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_individual INTEGER,
  price_buyback_shrink INTEGER,
  price_buyback_noshrink INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS secondary_market_history_product_id_idx ON secondary_market_history (product_id, recorded_at);
