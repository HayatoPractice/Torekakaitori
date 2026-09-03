-- 商品（BOX/パック）に再販履歴等の自由記述メモを持たせられるようにする。
-- 構造化はせず、後から手で書き足せる1つのメモ欄とする。

alter table products add column resale_notes text;
