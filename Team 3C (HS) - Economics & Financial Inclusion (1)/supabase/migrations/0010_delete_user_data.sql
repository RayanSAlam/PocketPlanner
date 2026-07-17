-- PocketPlanner — Delete All My Data (Settings page danger zone)
--
-- HOW TO APPLY: paste into Supabase Dashboard -> SQL Editor -> New query
-- -> Run, AFTER 0001-0009 have already been applied.
--
-- Scope: deletes FINANCIAL data only, not the account itself — the user
-- stays logged in (or lands back on /auth after the client signs them
-- out) but every account/transaction/budget/goal/document/import and
-- impact record they own is gone. Deliberately does NOT touch
-- notification_settings or impact_settings: those are consent/preference
-- rows, not financial data, and deleting impact_settings in particular
-- would silently reset an opted-out user back to the opted-in default via
-- its self-heal-on-read logic in useImpactSettings.ts — that would be a
-- privacy regression dressed up as a "delete everything" button.
--
-- Deletes are ordered children-before-parents. Most FKs in this schema
-- are `on delete cascade`, but transactions.account_id is `on delete
-- restrict` (see 0001), so transactions must be cleared before accounts
-- or the accounts delete would fail. categories only deletes this user's
-- OWN rows (user_id = auth.uid()) — the shared system categories seeded
-- in 0002 have user_id is null and are never touched.
--
-- Storage cleanup (the actual uploaded PDF/image bytes in the "documents"
-- bucket) is NOT done here — Postgres has no reach into Supabase Storage.
-- The client (src/hooks/useDeleteAllData.ts) removes those objects via
-- the Storage API BEFORE calling this function.
create or replace function public.delete_all_user_data()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  delete from goal_contributions where user_id = v_user_id;
  delete from budget_adjustments where user_id = v_user_id;
  delete from budget_lines where user_id = v_user_id;
  delete from goals where user_id = v_user_id;
  delete from budgets where user_id = v_user_id;
  delete from merchant_rules where user_id = v_user_id;
  delete from transactions where user_id = v_user_id;
  delete from accounts where user_id = v_user_id;
  delete from documents where user_id = v_user_id;
  delete from categories where user_id = v_user_id;
  delete from impact_events where user_id = v_user_id;
  delete from impact_snapshots where user_id = v_user_id;
  delete from impact_scores where user_id = v_user_id;
end;
$$;
grant execute on function public.delete_all_user_data() to authenticated;
