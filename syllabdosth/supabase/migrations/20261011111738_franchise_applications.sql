create table if not exists public.franchise_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null,
  preferred_location text not null,
  investment text not null default '',
  business_experience text not null default '',
  additional_details text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.franchise_applications enable row level security;
