-- 商品に「2次流通相場」（現在の目安価格・傾向メモ）を持たせる。
-- ショップの販売/買取価格（extracted_items由来の実データ）とは別物のため、
-- resale_notes（公式の再販履歴）とも区別した独立の列にする。
-- 過去の推移は保持せず、直近の調査結果1件だけを上書きする方針（checked_atで鮮度がわかる）。

alter table products add column secondary_market_price integer;
alter table products add column secondary_market_trend text;
alter table products add column secondary_market_checked_at timestamptz;
