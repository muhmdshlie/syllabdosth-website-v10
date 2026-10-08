-- Syllabdosth database schema
-- Run in Supabase: SQL Editor → paste this file → Run. Then run supabase/seed.sql.
--
-- Security model
--   * Row Level Security is ON for every table.
--   * The browser (anon key) can only READ the public catalogue and its own profile.
--   * All writes and private reads happen in Next.js server code with the service-role key,
--     after the server checks who the user is and what role they have (lib/auth.ts).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create type public.user_role as enum ('learner', 'professional', 'faculty', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  role public.user_role not null default 'learner',
  created_at timestamptz not null default now()
);

-- Create a profile automatically for every new sign-up (email, Google or phone).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.email,
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- catalogue
create table public.categories (
  slug text primary key,
  name text not null,
  tone text not null default 'linear-gradient(135deg,#E4E6E0,#C9D8BE)',
  sort int not null default 0
);

create table public.faculty (
  id text primary key default gen_random_uuid()::text,
  user_id uuid unique references public.profiles (id) on delete set null,
  name text not null,
  initials text not null,
  specialty text not null,
  years int not null default 0,
  students int not null default 0,
  bio text not null default ''
);

create table public.courses (
  id text primary key default gen_random_uuid()::text,
  slug text unique not null,
  title text not null,
  category_slug text not null references public.categories (slug),
  level text not null,
  duration_days int not null check (duration_days > 0),
  price int not null check (price >= 0),
  mode text not null default 'Online & offline',
  language text not null default 'English, Hindi, Kannada',
  rating numeric(2,1) not null default 4.8,
  ratings_count int not null default 0,
  students int not null default 0,
  summary text not null default '',
  description text not null default '',
  outcomes text[] not null default '{}',
  modules jsonb not null default '[]',          -- [{ "title": "...", "days": 10 }]
  faculty_id text references public.faculty (id) on delete set null,
  featured boolean not null default false,
  image_url text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index courses_category_idx on public.courses (category_slug);

create table public.services (
  id text primary key default gen_random_uuid()::text,
  slug text unique not null,
  title text not null,
  category text not null,
  initials text not null,
  summary text not null default '',
  description text not null default '',
  price_from int not null check (price_from >= 0),
  duration text not null default '',
  sort int not null default 0,
  published boolean not null default true
);

create table public.professionals (
  id text primary key default gen_random_uuid()::text,
  user_id uuid unique references public.profiles (id) on delete set null,
  slug text unique not null,
  name text not null,
  initials text not null,
  title text not null,
  city text not null default 'Bengaluru',
  rating numeric(2,1) not null default 5.0,
  bookings_count int not null default 0,
  service_ids text[] not null default '{}',
  bio text not null default '',
  verified boolean not null default false
);

create table public.blog_posts (
  slug text primary key,
  title text not null,
  category text not null,
  excerpt text not null default '',
  author text not null,
  read_mins int not null default 4,
  published_at date not null default current_date,
  intro text not null default '',
  sections jsonb not null default '[]',          -- [{ "heading": "...", "text": "..." }]
  quote text,
  published boolean not null default true
);

-- ---------------------------------------------------------------- transactions
create type public.booking_status as enum ('pending', 'confirmed', 'declined', 'cancelled', 'completed');
create type public.enquiry_status as enum ('new', 'contacted', 'converted', 'closed');
create type public.application_status as enum ('new', 'reviewing', 'approved', 'rejected');

create table public.bookings (
  id text primary key default gen_random_uuid()::text,   -- unguessable: the booking link is private
  service_id text not null references public.services (id),
  professional_id text not null references public.professionals (id),
  customer_id uuid references public.profiles (id) on delete set null,
  name text not null,
  phone text not null,
  preferred_date date not null,
  preferred_time text not null,
  location text not null,
  requirements text not null default '',
  price_from int not null,
  status public.booking_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index bookings_customer_idx on public.bookings (customer_id);
create index bookings_pro_idx on public.bookings (professional_id, status);

create table public.group_enquiries (
  id text primary key default gen_random_uuid()::text,
  name text not null, phone text not null, email text not null,
  people int not null check (people >= 2),
  preferred_date date not null,
  event_type text not null,
  location text not null,
  requirements text not null default '',
  status public.enquiry_status not null default 'new',
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id text primary key default gen_random_uuid()::text,
  course_id text not null references public.courses (id),
  user_id uuid references public.profiles (id) on delete set null,
  name text not null, phone text not null, email text not null,
  mode text not null,
  message text not null default '',
  status public.enquiry_status not null default 'new',
  created_at timestamptz not null default now()
);
create index enrollments_user_idx on public.enrollments (user_id);
create index enrollments_course_idx on public.enrollments (course_id);

create table public.applications (
  id text primary key default gen_random_uuid()::text,
  type text not null check (type in ('faculty', 'professional')),
  user_id uuid references public.profiles (id) on delete set null,
  name text not null, phone text not null, email text not null,
  city text not null, skill text not null,
  experience_years int not null default 0,
  message text not null default '',
  status public.application_status not null default 'new',
  created_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  email text primary key,
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id text primary key default gen_random_uuid()::text,
  name text not null, phone text not null, email text not null,
  topic text not null, message text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- row level security
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.faculty enable row level security;
alter table public.courses enable row level security;
alter table public.services enable row level security;
alter table public.professionals enable row level security;
alter table public.blog_posts enable row level security;
alter table public.bookings enable row level security;
alter table public.group_enquiries enable row level security;
alter table public.enrollments enable row level security;
alter table public.applications enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages enable row level security;

-- Public catalogue: readable by everyone.
create policy "catalogue read" on public.categories for select using (true);
create policy "catalogue read" on public.faculty for select using (true);
create policy "catalogue read" on public.courses for select using (published);
create policy "catalogue read" on public.services for select using (published);
create policy "catalogue read" on public.professionals for select using (verified);
create policy "catalogue read" on public.blog_posts for select using (published);

-- Users can read their own profile and their own bookings / enquiries.
create policy "own profile" on public.profiles for select using (auth.uid() = id);
create policy "own bookings" on public.bookings for select using (auth.uid() = customer_id);
create policy "own enrollments" on public.enrollments for select using (auth.uid() = user_id);
-- No insert/update/delete policies: those go through the server (service role).
