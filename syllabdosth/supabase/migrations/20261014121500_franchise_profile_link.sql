-- ============================================================================
-- Link a franchise login to its franchise organisation.
-- Run after 20261014120000_wallet.sql. Safe to re-run.
-- A profile with role = 'franchise' should have organisation_id set to its
-- organisations row (type = 'franchise'). The wallet is found through that link.
-- ============================================================================

alter table public.profiles
  add column if not exists organisation_id text references public.organisations (id) on delete set null;

create index if not exists profiles_organisation_idx on public.profiles (organisation_id);

-- Shows which franchise a login belongs to (for admins to check).
-- Example: link a franchise login after it has signed up:
--   update public.profiles
--   set role = 'franchise', organisation_id = 'the-organisation-id'
--   where email = 'franchise@example.com';
