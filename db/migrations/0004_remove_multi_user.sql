-- マルチユーザー機能を廃止し、単一ユーザー運用に戻す。
-- Basic認証（本番URLの保護）は環境変数（BASIC_AUTH_USER/BASIC_AUTH_PASSWORD）での
-- 固定認証に一本化し、DBでのユーザー管理・データ所有・共有設定は行わない。

alter table accounts drop column if exists owner_user_id;
alter table accounts drop column if exists is_shared;

drop table if exists users;
