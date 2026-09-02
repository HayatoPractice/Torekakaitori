-- アカウント（登録店舗）のプロフィールURL（Xアカウントページ等）を任意で持てるようにする。
-- 個別の投稿URL（posts.source_url）とは別物。こちらはアカウントそのものへのリンク。

alter table accounts add column url text;
