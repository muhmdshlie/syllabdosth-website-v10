-- ============================================================================
-- Wallet system: franchise wallets, manual commissions, append-only ledger.
-- Run once in Supabase → SQL Editor. Safe to re-run (uses "if not exists").
-- Amounts are INR, stored as numeric(12,2) — never floating point.
-- All writes go through the server (service role); RLS is on with no policies,
-- so the browser cannot read or write these tables directly.
-- ============================================================================

-- 1. Franchise login role (the app already checks for it).
alter type public.user_role add value if not exists 'franchise';

-- 2. One wallet per franchise organisation.
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  organisation_id text not null unique references public.organisations (id) on delete restrict,
  currency text not null default 'INR' check (currency = 'INR'),
  balance numeric(12,2) not null default 0 check (balance >= 0),   -- total money in the wallet
  reserved numeric(12,2) not null default 0 check (reserved >= 0), -- held for payout requests (used later)
  status text not null default 'active' check (status in ('active', 'frozen')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallets_reserved_within_balance check (reserved <= balance)
);

-- 3. Commissions recorded manually by an admin.
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  organisation_id text not null references public.organisations (id) on delete restrict,
  source_type text not null check (source_type in ('enrollment', 'booking', 'other')),
  source_ref text not null,                         -- e.g. the enrollment or booking id
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'credited' check (status in ('credited', 'reversed')),
  note text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Duplicate protection: the same source can only earn one commission.
  constraint commissions_source_unique unique (source_type, source_ref)
);

-- 4. Ledger: every money movement, never edited or deleted.
create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets (id) on delete restrict,
  entry_type text not null check (entry_type in ('commission', 'reversal', 'credit', 'debit', 'refund', 'payout', 'adjustment')),
  amount numeric(12,2) not null check (amount <> 0), -- signed: + into the wallet, - out of it
  balance_after numeric(12,2) not null check (balance_after >= 0),
  reference_key text not null unique,               -- idempotency key, e.g. 'commission:<id>'
  commission_id uuid references public.commissions (id) on delete restrict,
  description text not null default '',
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists wallet_ledger_wallet_idx on public.wallet_ledger (wallet_id, created_at desc);

create or replace function public.wallet_ledger_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'wallet_ledger is append-only; post a reversal or adjustment instead';
end $$;

drop trigger if exists wallet_ledger_no_change on public.wallet_ledger;
create trigger wallet_ledger_no_change
  before update or delete on public.wallet_ledger
  for each row execute function public.wallet_ledger_append_only();

-- 5. Row Level Security: on, with no policies (server-only access).
alter table public.wallets enable row level security;
alter table public.commissions enable row level security;
alter table public.wallet_ledger enable row level security;

-- 6. Record a commission and credit the franchise wallet, in ONE transaction.
--    A repeated source (same source_type + source_ref) raises an error and changes nothing.
create or replace function public.add_commission(
  p_organisation_id text,
  p_source_type text,
  p_source_ref text,
  p_amount numeric,
  p_note text,
  p_actor uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_wallet uuid;
  v_commission uuid;
  v_balance numeric(12,2);
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Commission amount must be greater than zero';
  end if;
  if not exists (select 1 from public.organisations where id = p_organisation_id and type = 'franchise') then
    raise exception 'Commissions can only be recorded for franchise organisations';
  end if;

  insert into public.wallets (organisation_id) values (p_organisation_id)
  on conflict (organisation_id) do nothing;

  select id into v_wallet from public.wallets where organisation_id = p_organisation_id for update;

  insert into public.commissions (organisation_id, source_type, source_ref, amount, note, created_by)
  values (p_organisation_id, p_source_type, p_source_ref, p_amount, coalesce(p_note, ''), p_actor)
  returning id into v_commission;

  update public.wallets set balance = balance + p_amount, updated_at = now()
  where id = v_wallet
  returning balance into v_balance;

  insert into public.wallet_ledger (wallet_id, entry_type, amount, balance_after, reference_key, commission_id, description, actor_id)
  values (v_wallet, 'commission', p_amount, v_balance, 'commission:' || v_commission, v_commission,
          coalesce(nullif(p_note, ''), 'Commission for ' || p_source_type || ' ' || p_source_ref), p_actor);

  insert into public.activity_log (actor_id, action, entity, entity_id, summary)
  values (p_actor, 'create', 'commission', v_commission::text,
          'Commission ₹' || p_amount || ' credited for ' || p_source_type || ' ' || p_source_ref);

  return v_commission;
end $$;

-- 7. Reverse a credited commission: the wallet is debited and the commission marked reversed.
--    The original ledger row stays; the reversal is a new row.
create or replace function public.reverse_commission(
  p_commission uuid,
  p_reason text,
  p_actor uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  c public.commissions%rowtype;
  v_wallet uuid;
  v_balance numeric(12,2);
begin
  select * into c from public.commissions where id = p_commission for update;
  if not found then raise exception 'Commission not found'; end if;
  if c.status <> 'credited' then raise exception 'This commission is already reversed'; end if;

  select id into v_wallet from public.wallets where organisation_id = c.organisation_id for update;
  if (select balance - reserved from public.wallets where id = v_wallet) < c.amount then
    raise exception 'Not enough available balance to reverse this commission (some may already be paid out or reserved)';
  end if;

  update public.commissions set status = 'reversed' where id = c.id;

  update public.wallets set balance = balance - c.amount, updated_at = now()
  where id = v_wallet
  returning balance into v_balance;

  insert into public.wallet_ledger (wallet_id, entry_type, amount, balance_after, reference_key, commission_id, description, actor_id)
  values (v_wallet, 'reversal', -c.amount, v_balance, 'reversal:' || c.id, c.id,
          'Reversal: ' || coalesce(nullif(p_reason, ''), 'no reason given'), p_actor);

  insert into public.activity_log (actor_id, action, entity, entity_id, summary)
  values (p_actor, 'update', 'commission', c.id::text,
          'Commission ₹' || c.amount || ' reversed: ' || coalesce(nullif(p_reason, ''), 'no reason given'));
end $$;

-- 8. Only the server (service role) may call these functions.
revoke execute on function public.add_commission(text, text, text, numeric, text, uuid) from public, anon, authenticated;
revoke execute on function public.reverse_commission(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.add_commission(text, text, text, numeric, text, uuid) to service_role;
grant execute on function public.reverse_commission(uuid, text, uuid) to service_role;
