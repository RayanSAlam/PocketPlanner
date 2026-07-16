-- PocketPlanner — transaction ingestion schema
--
-- HOW TO APPLY: there is no Supabase CLI session set up for this project yet,
-- so these migrations are plain SQL files, not CLI-managed migrations.
-- Paste 0001 through 0005 into Supabase Dashboard -> SQL Editor -> New query
-- -> Run, IN ORDER. Before running 0004, first create a PRIVATE Storage
-- bucket named "documents" via Dashboard -> Storage -> New bucket
-- (uncheck "Public"). No CLI needed for any of this.

-- ============================================================
-- Enums
-- ============================================================
create type doc_type as enum ('bank_statement', 'receipt', 'pay_stub', 'csv_export', 'unknown');
create type doc_status as enum ('uploaded', 'scanning', 'extracting', 'review', 'confirmed', 'rejected', 'failed');
create type account_type as enum ('cash', 'checking', 'savings', 'credit', 'other');
create type tx_source as enum ('manual', 'upload_csv', 'upload_pdf', 'upload_image');

-- ============================================================
-- accounts
-- ============================================================
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type account_type not null default 'cash',
  balance numeric(12,2) not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table accounts enable row level security;
create policy "accounts_select_own" on accounts for select using (user_id = auth.uid());
create policy "accounts_insert_own" on accounts for insert with check (user_id = auth.uid());
create policy "accounts_update_own" on accounts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "accounts_delete_own" on accounts for delete using (user_id = auth.uid());

-- ============================================================
-- categories (user_id null = shared system category)
-- ============================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  slug text not null,
  name text not null,
  icon text not null default 'circle',
  swatch text not null default 'muted',
  is_system boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

-- Postgres treats NULL as distinct in a normal UNIQUE constraint, so
-- unique(user_id, slug) alone would NOT stop duplicate system rows
-- (user_id is null) from being inserted twice. Partial index closes that gap.
create unique index categories_system_slug_uidx on categories (slug) where user_id is null;

alter table categories enable row level security;
create policy "categories_select" on categories for select using (user_id is null or user_id = auth.uid());
create policy "categories_insert_own" on categories for insert with check (user_id = auth.uid() and is_system = false);
create policy "categories_update_own" on categories for update using (user_id = auth.uid() and is_system = false) with check (user_id = auth.uid() and is_system = false);
create policy "categories_delete_own" on categories for delete using (user_id = auth.uid() and is_system = false);

-- ============================================================
-- documents
-- ============================================================
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  mime_type text not null,
  size_bytes int not null default 0,
  doc_type doc_type not null default 'unknown',
  status doc_status not null default 'uploaded',
  storage_path text,
  extracted_total numeric(12,2),
  row_count int not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table documents enable row level security;
create policy "documents_select_own" on documents for select using (user_id = auth.uid());
create policy "documents_insert_own" on documents for insert with check (user_id = auth.uid());
create policy "documents_update_own" on documents for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "documents_delete_own" on documents for delete using (user_id = auth.uid());

create index documents_user_created_idx on documents (user_id, created_at desc);

-- ============================================================
-- transactions
-- ============================================================
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete restrict,
  category_id uuid references categories(id) on delete set null,
  document_id uuid references documents(id) on delete set null,
  amount numeric(12,2) not null,
  description text not null default '',
  merchant_raw text,
  merchant_normalized text,
  tx_date date not null,
  source tx_source not null default 'manual',
  confidence numeric(3,2),
  is_recurring boolean not null default false,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table transactions enable row level security;
create policy "transactions_select_own" on transactions for select using (user_id = auth.uid());
create policy "transactions_insert_own" on transactions for insert with check (user_id = auth.uid());
create policy "transactions_update_own" on transactions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "transactions_delete_own" on transactions for delete using (user_id = auth.uid());

create index transactions_user_date_idx on transactions (user_id, tx_date desc);
create index transactions_user_document_idx on transactions (user_id, document_id);
create index transactions_user_merchant_idx on transactions (user_id, merchant_normalized);

-- RLS alone only proves user_id = auth.uid() on the transaction row itself;
-- it does NOT stop a caller from pointing account_id/category_id/document_id
-- at a row some OTHER user owns (the foreign key just checks the row
-- exists, not who owns it). This trigger closes that gap.
create or replace function public.enforce_transaction_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from accounts a where a.id = new.account_id and a.user_id = new.user_id) then
    raise exception 'account does not belong to user';
  end if;
  if new.category_id is not null and not exists (
    select 1 from categories c where c.id = new.category_id and (c.user_id is null or c.user_id = new.user_id)
  ) then
    raise exception 'category not accessible to user';
  end if;
  if new.document_id is not null and not exists (
    select 1 from documents d where d.id = new.document_id and d.user_id = new.user_id
  ) then
    raise exception 'document does not belong to user';
  end if;
  return new;
end;
$$;

create trigger transactions_enforce_ownership
  before insert or update on transactions
  for each row execute function public.enforce_transaction_ownership();

-- ============================================================
-- merchant_rules
-- ============================================================
create table merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_pattern text not null,
  category_id uuid not null references categories(id) on delete cascade,
  hit_count int not null default 1,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, merchant_pattern)
);

alter table merchant_rules enable row level security;
create policy "merchant_rules_select_own" on merchant_rules for select using (user_id = auth.uid());
create policy "merchant_rules_insert_own" on merchant_rules for insert with check (user_id = auth.uid());
create policy "merchant_rules_update_own" on merchant_rules for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "merchant_rules_delete_own" on merchant_rules for delete using (user_id = auth.uid());

create index merchant_rules_user_pattern_idx on merchant_rules (user_id, merchant_pattern);

-- ============================================================
-- budgets
-- ============================================================
create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  monthly_limit numeric(12,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id)
);

alter table budgets enable row level security;
create policy "budgets_select_own" on budgets for select using (user_id = auth.uid());
create policy "budgets_insert_own" on budgets for insert with check (user_id = auth.uid());
create policy "budgets_update_own" on budgets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "budgets_delete_own" on budgets for delete using (user_id = auth.uid());

-- ============================================================
-- Default "Cash" account for every new signup
-- ============================================================
create or replace function public.handle_new_user_default_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.accounts (user_id, name, type, is_default)
  values (new.id, 'Cash', 'cash', true);
  return new;
end;
$$;

create trigger on_auth_user_created_default_account
  after insert on auth.users
  for each row execute function public.handle_new_user_default_account();

-- ============================================================
-- Explicit grants (belt-and-suspenders alongside Supabase's default
-- public-schema privileges for the authenticated role)
-- ============================================================
grant select, insert, update, delete on accounts, categories, documents, transactions, merchant_rules, budgets to authenticated;
