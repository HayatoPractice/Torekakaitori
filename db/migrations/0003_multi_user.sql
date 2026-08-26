-- マルチユーザー化：ユーザーごとにデータを分離し、任意で共有できるようにする。
-- 前提：0002で作成したauth_credentials（単一行の共通ログイン情報）が既に存在すること。
-- そこに入っている現在のログイン情報を、そのまま最初の管理者ユーザーとして引き継ぐ。

create table users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_salt text not null,
  password_hash text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

insert into users (username, password_salt, password_hash, is_admin)
select username, password_salt, password_hash, true
from auth_credentials
where id = true;

drop table auth_credentials;

-- 登録店舗（アカウント）の所有者・共有可否
alter table accounts
  add column owner_user_id uuid references users(id) on delete cascade,
  add column is_shared boolean not null default false;

-- マイグレーション前から存在していたアカウントは、最初の管理者の所有にする
update accounts
set owner_user_id = (select id from users where is_admin = true order by created_at limit 1)
where owner_user_id is null;

alter table accounts alter column owner_user_id set not null;

create index accounts_owner_user_id_idx on accounts(owner_user_id);
