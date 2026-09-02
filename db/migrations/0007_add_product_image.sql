-- 商品（カード/BOX）ごとに代表画像を1枚、任意で持てるようにする。
-- 投稿画像（post_images）と同じくbyteaで直接保存する（Neonにファイルストレージが無いため）。

alter table products add column image_data bytea;
alter table products add column image_mime_type text;
