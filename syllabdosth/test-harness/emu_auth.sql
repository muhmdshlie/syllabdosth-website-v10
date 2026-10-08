alter table auth.users add column if not exists encrypted_password text,
  add column if not exists email_confirmed_at timestamptz, add column if not exists phone_confirmed_at timestamptz,
  add column if not exists last_sign_in_at timestamptz, add column if not exists raw_app_meta_data jsonb;
create table auth.emu_refresh_tokens (token text primary key, user_id uuid references auth.users on delete cascade);
create table auth.emu_tokens (token text primary key, user_id uuid references auth.users on delete cascade, type text, code_challenge text, kind text not null default 'link', created_at timestamptz default now());
create table auth.emu_sms (phone text, code text, created_at timestamptz default now());
