-- Basic認証のユーザー名・パスワードをDBで管理できるようにする（設定画面から変更可能にするため）。
-- 常に1行だけ存在する設定テーブル（idはtrue固定）。

create table auth_credentials (
  id boolean primary key default true check (id),
  username text not null,
  password_salt text not null,
  password_hash text not null,
  updated_at timestamptz not null default now()
);
