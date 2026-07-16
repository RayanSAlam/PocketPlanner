-- Helper RPCs: default-account backfill, duplicate detection, atomic
-- confirm-import, batch undo, recurring detection, merchant learning.

-- ------------------------------------------------------------
-- ensure_default_account: idempotent — creates a Cash account for the
-- calling user if they don't already have one. The 0001 trigger only
-- covers signups AFTER this migration ran; this RPC backfills the
-- already-existing user so Manual Entry has an account to write to.
-- ------------------------------------------------------------
create or replace function public.ensure_default_account()
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  select id into v_account_id from accounts where user_id = auth.uid() order by created_at asc limit 1;
  if v_account_id is null then
    insert into accounts (user_id, name, type, is_default)
    values (auth.uid(), 'Cash', 'cash', true)
    returning id into v_account_id;
  end if;
  return v_account_id;
end;
$$;
grant execute on function public.ensure_default_account() to authenticated;

-- ------------------------------------------------------------
-- check_duplicate_candidates: given candidate rows (jsonb array of
-- {tx_date, amount, description}), returns existing transactions that
-- look like probable duplicates (same amount, date within 1 day, and
-- similar description). Uses pg_trgm similarity() if that extension is
-- enabled, otherwise falls back to normalized exact-match — the
-- similarity() call is inside a dynamically-EXECUTEd string so it's only
-- parsed/resolved when pg_trgm is actually present (referencing a
-- nonexistent function anywhere in a statically-parsed query would fail
-- at call time even in an untaken branch).
-- ------------------------------------------------------------
create or replace function public.check_duplicate_candidates(p_rows jsonb)
returns table (candidate_index int, existing_transaction_id uuid, existing_description text, existing_date date, existing_amount numeric)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  has_trgm boolean;
begin
  select exists (select 1 from pg_extension where extname = 'pg_trgm') into has_trgm;

  if has_trgm then
    return query execute $q$
      select (r.idx)::int, t.id, t.description, t.tx_date, t.amount
      from jsonb_array_elements($1) with ordinality as r(row_data, idx)
      join transactions t
        on t.user_id = auth.uid()
        and t.deleted_at is null
        and t.amount = (r.row_data->>'amount')::numeric
        and t.tx_date between ((r.row_data->>'tx_date')::date - 1) and ((r.row_data->>'tx_date')::date + 1)
        and similarity(lower(t.description), lower(r.row_data->>'description')) > 0.4
    $q$ using p_rows;
  else
    return query
    select (r.idx)::int, t.id, t.description, t.tx_date, t.amount
    from jsonb_array_elements(p_rows) with ordinality as r(row_data, idx)
    join transactions t
      on t.user_id = auth.uid()
      and t.deleted_at is null
      and t.amount = (r.row_data->>'amount')::numeric
      and t.tx_date between ((r.row_data->>'tx_date')::date - 1) and ((r.row_data->>'tx_date')::date + 1)
      and lower(trim(t.description)) = lower(trim(r.row_data->>'description'));
  end if;
end;
$$;
grant execute on function public.check_duplicate_candidates(jsonb) to authenticated;

-- ------------------------------------------------------------
-- confirm_document_import: writes all confirmed rows for a document in
-- one call. security invoker (not definer) so RLS + the ownership
-- trigger from 0001 still apply to every inserted row — this does not
-- bypass any security check, it just batches them.
-- ------------------------------------------------------------
create or replace function public.confirm_document_import(p_document_id uuid, p_rows jsonb)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row jsonb;
  v_inserted int := 0;
  v_source tx_source;
begin
  if not exists (select 1 from documents where id = p_document_id and user_id = auth.uid()) then
    raise exception 'document not found or not owned by user';
  end if;

  select case doc_type
    when 'csv_export' then 'upload_csv'::tx_source
    when 'receipt' then 'upload_image'::tx_source
    else 'upload_pdf'::tx_source
  end into v_source
  from documents where id = p_document_id;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    insert into transactions (
      user_id, account_id, category_id, document_id,
      amount, description, merchant_raw, merchant_normalized,
      tx_date, source, confidence, is_recurring
    ) values (
      auth.uid(),
      (v_row->>'account_id')::uuid,
      nullif(v_row->>'category_id', '')::uuid,
      p_document_id,
      (v_row->>'amount')::numeric,
      coalesce(v_row->>'description', ''),
      v_row->>'merchant_raw',
      v_row->>'merchant_normalized',
      (v_row->>'tx_date')::date,
      v_source,
      nullif(v_row->>'confidence', '')::numeric,
      coalesce((v_row->>'is_recurring')::boolean, false)
    );
    v_inserted := v_inserted + 1;
  end loop;

  update documents
  set status = 'confirmed', confirmed_at = now(), row_count = v_inserted
  where id = p_document_id;

  return v_inserted;
end;
$$;
grant execute on function public.confirm_document_import(uuid, jsonb) to authenticated;

-- ------------------------------------------------------------
-- undo_import_batch: soft-deletes every transaction from a confirmed
-- document and resets its status, so Import History's "Undo" is a
-- single reversible action.
-- ------------------------------------------------------------
create or replace function public.undo_import_batch(p_document_id uuid)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count int;
begin
  update transactions
  set deleted_at = now()
  where document_id = p_document_id and user_id = auth.uid() and deleted_at is null;

  get diagnostics v_count = row_count;

  update documents
  set status = 'review', row_count = 0
  where id = p_document_id and user_id = auth.uid();

  return v_count;
end;
$$;
grant execute on function public.undo_import_batch(uuid) to authenticated;

-- ------------------------------------------------------------
-- detect_recurring_candidates: merchants with >=3 occurrences roughly
-- monthly apart (25-35 day gaps, low variance) — a suggestion the UI
-- surfaces as "mark as recurring?", never an automatic write.
-- ------------------------------------------------------------
create or replace function public.detect_recurring_candidates()
returns table (merchant_normalized text, category_id uuid, avg_amount numeric, occurrence_count int, avg_gap_days numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with gaps as (
    select
      merchant_normalized,
      category_id,
      amount,
      tx_date,
      tx_date - lag(tx_date) over (partition by merchant_normalized order by tx_date) as gap_days
    from transactions
    where user_id = auth.uid()
      and deleted_at is null
      and merchant_normalized is not null
  ),
  grouped as (
    select
      merchant_normalized,
      max(category_id::text)::uuid as category_id,
      avg(amount) as avg_amount,
      count(*) as occurrence_count,
      avg(gap_days) filter (where gap_days is not null) as avg_gap_days,
      stddev(gap_days) filter (where gap_days is not null) as gap_stddev
    from gaps
    group by merchant_normalized
  )
  select merchant_normalized, category_id, avg_amount, occurrence_count::int, avg_gap_days
  from grouped
  where occurrence_count >= 3
    and avg_gap_days between 25 and 35
    and (gap_stddev is null or gap_stddev < 6)
  order by occurrence_count desc;
$$;
grant execute on function public.detect_recurring_candidates() to authenticated;

-- ------------------------------------------------------------
-- upsert_merchant_rule: called whenever a user sets/changes a category
-- for a merchant, so the same merchant auto-suggests that category next
-- time (checked client-side before falling back to no category).
-- ------------------------------------------------------------
create or replace function public.upsert_merchant_rule(p_merchant text, p_category_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into merchant_rules (user_id, merchant_pattern, category_id, hit_count, last_used_at)
  values (auth.uid(), p_merchant, p_category_id, 1, now())
  on conflict (user_id, merchant_pattern)
  do update set category_id = excluded.category_id, hit_count = merchant_rules.hit_count + 1, last_used_at = now();
$$;
grant execute on function public.upsert_merchant_rule(text, uuid) to authenticated;
