-- Supabase Schema Definition for VintVerify (古着ブランド・年代鑑定ツール)

-- 既存のテーブル・トリガーをクリーンアップ（必要に応じて実行）
-- drop table if exists public.price_log cascade;
-- drop table if exists public.submissions cascade;
-- drop table if exists public.brands cascade;
-- drop table if exists public.diagnoses cascade;
-- drop table if exists public.users cascade;

--------------------------------------------------
-- 1. users テーブル
-- auth.usersテーブルと連動し、ユーザー情報を管理する
--------------------------------------------------
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  premium_until timestamp with time zone default now(),
  created_at timestamp with time zone default now() not null
);

-- RLS (Row Level Security) の有効化
alter table public.users enable row level security;

-- ポリシー定義
create policy "ユーザー自身のみが自分のユーザーデータを取得可能"
  on public.users for select
  using (auth.uid() = id);

create policy "ユーザー自身のみが自分のユーザーデータを更新可能"
  on public.users for update
  using (auth.uid() = id);

--------------------------------------------------
-- 2. diagnoses テーブル
-- 診断結果履歴を保存する
--------------------------------------------------
create table public.diagnoses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  brand_name text,
  estimated_era text,
  evidence_reason text,
  overall_image_url text not null,
  tag_image_url text not null,
  buying_guide text check (buying_guide in ('buy', 'skip', 'hold')), -- buy(買い), skip(見送り), hold(様子見)
  created_at timestamp with time zone default now() not null
);

alter table public.diagnoses enable row level security;

-- ポリシー定義
create policy "ユーザー自身のみが自分の診断履歴を取得可能"
  on public.diagnoses for select
  using (auth.uid() = user_id);

create policy "ユーザー自身のみが自分の診断履歴を作成可能"
  on public.diagnoses for insert
  with check (auth.uid() = user_id);

create policy "ユーザー自身のみが自分の診断履歴を削除可能"
  on public.diagnoses for delete
  using (auth.uid() = user_id);

--------------------------------------------------
-- 3. brands テーブル
-- 確定されたブランド・年代の特徴情報をマスタとして保持
--------------------------------------------------
create table public.brands (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  era text not null,
  tag_features text,      -- タグデザインの特徴（ロゴ、フォント、刺繍等）
  stitch_features text,   -- シングル/ダブルステッチ、縫製特徴
  material_features text, -- 素材タグ、ケア表記の特徴
  reference_image_url text,
  created_at timestamp with time zone default now() not null,
  constraint unique_brand_era unique (name, era)
);

alter table public.brands enable row level security;

-- 全ユーザー（未認証含む）が読み取り可能
create policy "ブランド情報は全員が読み取り可能"
  on public.brands for select
  using (true);

-- 管理者（Supabase Dashboard 等）のみ書き込み可能とするため、insert/update/delete ポリシーは定義しない
-- （ポリシーが定義されていない場合、テーブル所有者またはサービスロールのみが操作可能です）

--------------------------------------------------
-- 4. submissions テーブル
-- ユーザーから寄せられるナレッジベースの投稿（承認待ち）
--------------------------------------------------
create table public.submissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete set null,
  brand_name text not null,
  estimated_era text not null,
  features text not null, -- 判別ポイント
  image_url text not null, -- 証拠写真URL
  sale_price numeric,     -- 実売価格（任意）
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default now() not null
);

alter table public.submissions enable row level security;

-- ポリシー定義
create policy "認証済みユーザーは投稿を新規作成可能"
  on public.submissions for insert
  with check (auth.uid() = user_id);

create policy "ユーザー自身は自分の投稿を読み取り可能"
  on public.submissions for select
  using (auth.uid() = user_id);

-- 全員が承認済みの投稿を読み取り可能（ナレッジベース用）
create policy "承認済みの投稿は全員が読み取り可能"
  on public.submissions for select
  using (status = 'approved');

--------------------------------------------------
-- 5. price_log テーブル
-- 価格の履歴データ（タイムスタンプ付き）
--------------------------------------------------
create table public.price_log (
  id uuid default gen_random_uuid() primary key,
  brand_name text not null,
  era text not null,
  price numeric not null,
  source text not null check (source in ('ai', 'user_submission', 'manual')), -- ai, user_submission, manual
  submission_id uuid references public.submissions(id) on delete set null,
  created_at timestamp with time zone default now() not null
);

alter table public.price_log enable row level security;

-- 全員が価格ログを読み取り可能（相場算出用）
create policy "価格ログは全員が読み取り可能"
  on public.price_log for select
  using (true);

-- 挿入ポリシーは定義せず、API Routes (service role) またはトリガー等で書き込む

--------------------------------------------------
-- トリガー: auth.users に新規登録された時、自動で public.users にレコードを作成する
--------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, premium_until)
  values (new.id, new.email, now()); -- 初期状態では非プレミアム（現在時刻まで有効）
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

--------------------------------------------------
-- トリガー: submissions テーブルのステータスが 'approved' に変更された時、
-- 1. price_log に価格データを転記 (実売価格が登録されている場合)
-- 2. 投稿者の premium_until を 7日間延長する
--------------------------------------------------
create or replace function public.handle_approved_submission()
returns trigger as $$
begin
  -- ステータスが approved に変更された場合
  if new.status = 'approved' and (old.status is null or old.status <> 'approved') then
    
    -- 1. 実売価格がある場合、price_logに挿入する
    if new.sale_price is not null then
      insert into public.price_log (brand_name, era, price, source, submission_id)
      values (new.brand_name, new.estimated_era, new.sale_price, 'user_submission', new.id);
    end if;

    -- 2. 投稿者のプレミアム期間を7日間延長する
    -- 現在の premium_until が未来ならそこから+7日、過去なら現在時刻から+7日
    update public.users
    set premium_until = case 
      when premium_until > now() then premium_until + interval '7 days'
      else now() + interval '7 days'
    end
    where id = new.user_id;

  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_submission_approved
  after update on public.submissions
  for each row execute procedure public.handle_approved_submission();

--------------------------------------------------
-- パフォーマンス向上のためのインデックス定義
--------------------------------------------------
create index idx_diagnoses_user_id on public.diagnoses(user_id);
create index idx_price_log_brand_era on public.price_log(brand_name, era);
create index idx_submissions_user_id on public.submissions(user_id);
create index idx_submissions_status on public.submissions(status);

--------------------------------------------------
-- 価格相場サマリを DB 側で集計する関数
-- （全件をクライアントへ取得してJSで集計するのを避け、インデックスを使った集計に置き換える）
-- idx_price_log_brand_era を利用するため、レコードが増えても高速に動作する
--------------------------------------------------
create or replace function public.get_price_stats(p_brand text, p_era text)
returns table (
  min_price numeric,
  max_price numeric,
  avg_price numeric,
  cnt bigint,
  last_updated timestamp with time zone
)
language sql
stable
as $$
  select
    min(price)            as min_price,
    max(price)            as max_price,
    round(avg(price))     as avg_price,
    count(*)              as cnt,
    max(created_at)       as last_updated
  from public.price_log
  where brand_name = p_brand
    and era = p_era;
$$;

-- 未認証ユーザーを含む全員が相場サマリを取得可能にする
grant execute on function public.get_price_stats(text, text) to anon, authenticated;
