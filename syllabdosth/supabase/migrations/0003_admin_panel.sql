-- Syllabdosth admin panel: LMS tables, CMS content, settings, media, support, marketing, activity log.
-- Run in Supabase: SQL Editor → paste this file → Run (after 0001_schema.sql and seed.sql).
-- Safe to run more than once.
--
-- Security model (same as 0001): Row Level Security is ON for every table. Everything the admin
-- panel reads or writes goes through Next.js server code with the service-role key, after the
-- server checks the user is an admin. Only a few public or "own row" read policies are added.

-- ---------------------------------------------------------------- extra columns on existing tables
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists avatar_url text;
do $$ begin
  alter table public.profiles add constraint profiles_status_check check (status in ('active', 'blocked'));
exception when duplicate_object then null; end $$;

alter table public.categories add column if not exists image_url text;
alter table public.categories add column if not exists description text not null default '';
alter table public.services add column if not exists image_url text;
alter table public.faculty add column if not exists photo_url text;
alter table public.faculty add column if not exists email text;
alter table public.faculty add column if not exists phone text;
alter table public.faculty add column if not exists created_at timestamptz not null default now();
alter table public.professionals add column if not exists photo_url text;
alter table public.professionals add column if not exists created_at timestamptz not null default now();
alter table public.blog_posts add column if not exists image_url text;
alter table public.blog_posts add column if not exists created_at timestamptz not null default now();
alter table public.services add column if not exists created_at timestamptz not null default now();
alter table public.enrollments add column if not exists notes text not null default '';
alter table public.bookings add column if not exists notes text not null default '';
alter table public.group_enquiries add column if not exists notes text not null default '';
alter table public.contact_messages add column if not exists status text not null default 'new';
alter table public.newsletter_subscribers add column if not exists name text;

-- ---------------------------------------------------------------- CMS content & settings
-- One row per editable page or settings group, e.g. 'page.home', 'settings.general'.
-- Private: holds SMTP / API passwords too, so there is NO public read policy.
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create table if not exists public.media (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  url text not null,
  path text,
  mime text not null default '',
  size_bytes int not null default 0,
  alt text not null default '',
  folder text not null default 'general',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- LMS
create table if not exists public.course_lessons (
  id text primary key default gen_random_uuid()::text,
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  kind text not null default 'video' check (kind in ('video', 'reading', 'live', 'download')),
  content text not null default '',
  video_url text,
  duration_mins int not null default 0,
  sort int not null default 0,
  free_preview boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists course_lessons_course_idx on public.course_lessons (course_id, sort);

create table if not exists public.course_reviews (
  id text primary key default gen_random_uuid()::text,
  course_id text not null references public.courses (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  rating int not null default 5 check (rating between 1 and 5),
  comment text not null default '',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id text primary key default gen_random_uuid()::text,
  code text unique not null default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10)),
  user_id uuid references public.profiles (id) on delete set null,
  student_name text not null,
  course_id text not null references public.courses (id) on delete cascade,
  issued_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id text primary key default gen_random_uuid()::text,
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  description text not null default '',
  pass_percent int not null default 60 check (pass_percent between 0 and 100),
  time_limit_mins int not null default 0,
  questions jsonb not null default '[]',         -- [{ "question": "...", "options": ["a","b"], "correct": 1 }]
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id text primary key default gen_random_uuid()::text,
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  instructions text not null default '',
  due_date date,
  max_marks int not null default 100,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id text primary key default gen_random_uuid()::text,
  kind text not null check (kind in ('quiz', 'assignment')),
  quiz_id text references public.quizzes (id) on delete cascade,
  assignment_id text references public.assignments (id) on delete cascade,
  course_id text references public.courses (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  student_name text not null default '',
  answer text not null default '',
  answers jsonb not null default '[]',
  score int,
  max_score int,
  status text not null default 'submitted' check (status in ('submitted', 'graded', 'returned')),
  feedback text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists submissions_user_idx on public.submissions (user_id);

create table if not exists public.live_classes (
  id text primary key default gen_random_uuid()::text,
  course_id text references public.courses (id) on delete set null,
  faculty_id text references public.faculty (id) on delete set null,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  duration_mins int not null default 60,
  platform text not null default 'Google Meet',
  meeting_url text,
  recording_url text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- organisations & staff
create table if not exists public.organisations (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  type text not null default 'training_partner' check (type in ('franchise', 'training_partner', 'corporate', 'college', 'other')),
  contact_person text not null default '',
  email text, phone text,
  city text not null default '',
  address text not null default '',
  students int not null default 0,
  status text not null default 'active' check (status in ('active', 'pending', 'inactive')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.staff (
  id text primary key default gen_random_uuid()::text,
  user_id uuid unique references public.profiles (id) on delete set null,
  name text not null,
  email text, phone text,
  designation text not null default '',
  department text not null default '',
  permissions text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- communication
create table if not exists public.notifications (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  body text not null default '',
  audience text not null default 'all' check (audience in ('all', 'learner', 'professional', 'faculty', 'user')),
  user_id uuid references public.profiles (id) on delete cascade,
  link text,
  send_email boolean not null default false,
  sent_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  email text, phone text,
  subject text not null,
  category text not null default 'General',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  messages jsonb not null default '[]',          -- [{ "from": "user"|"admin", "name": "...", "text": "...", "at": "iso" }]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id text primary key default gen_random_uuid()::text,
  question text not null,
  answer text not null,
  category text not null default 'General',
  sort int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  role text not null default '',
  quote text not null,
  photo_url text,
  rating int not null default 5 check (rating between 1 and 5),
  sort int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  code text,
  description text not null default '',
  discount_text text not null default '',
  course_id text references public.courses (id) on delete cascade,
  valid_until date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  key text primary key,
  name text not null,
  subject text not null,
  body text not null,
  enabled boolean not null default true
);

create table if not exists public.sms_templates (
  key text primary key,
  name text not null,
  body text not null,
  dlt_template_id text,
  enabled boolean not null default true
);

create table if not exists public.activity_log (
  id text primary key default gen_random_uuid()::text,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text not null default '',
  action text not null,
  entity text not null default '',
  entity_id text,
  summary text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists activity_log_created_idx on public.activity_log (created_at desc);

-- ---------------------------------------------------------------- row level security
alter table public.site_content enable row level security;
alter table public.media enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_reviews enable row level security;
alter table public.certificates enable row level security;
alter table public.quizzes enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.live_classes enable row level security;
alter table public.organisations enable row level security;
alter table public.staff enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.faqs enable row level security;
alter table public.testimonials enable row level security;
alter table public.offers enable row level security;
alter table public.email_templates enable row level security;
alter table public.sms_templates enable row level security;
alter table public.activity_log enable row level security;

drop policy if exists "public read" on public.faqs;
create policy "public read" on public.faqs for select using (published);
drop policy if exists "public read" on public.testimonials;
create policy "public read" on public.testimonials for select using (published);
drop policy if exists "public read" on public.course_reviews;
create policy "public read" on public.course_reviews for select using (approved);
drop policy if exists "public read" on public.offers;
create policy "public read" on public.offers for select using (active);
drop policy if exists "own certificates" on public.certificates;
create policy "own certificates" on public.certificates for select using (auth.uid() = user_id);
drop policy if exists "own submissions" on public.submissions;
create policy "own submissions" on public.submissions for select using (auth.uid() = user_id);
drop policy if exists "own tickets" on public.support_tickets;
create policy "own tickets" on public.support_tickets for select using (auth.uid() = user_id);
-- No insert/update/delete policies: all writes go through the server (service role).

-- ---------------------------------------------------------------- default content
insert into public.faqs (id, question, answer, sort) values
  ('faq-1', 'Are the certificates recognised?', 'Yes. Every course ends with an industry-recognised Syllabdosth certificate, and graduates can apply to join our verified professional network.', 0),
  ('faq-2', 'Can I learn online?', 'Most courses run online and offline. Short courses (up to 14 days) are fully online; longer programmes combine live online classes with centre practice.', 1),
  ('faq-3', 'What happens if I''m not happy with a booking?', 'Contact support within 48 hours. We review every complaint with the professional and arrange a redo or refund where appropriate.', 2),
  ('faq-4', 'Do I need equipment before I start a course?', 'No. Your first-week kit list is shared after enrolment, and starter kits are available at partner centres.', 3),
  ('faq-5', 'Is there a refund policy for courses?', 'Yes — a 30-day money-back guarantee if the course isn''t right for you.', 4),
  ('faq-6', 'Which cities is Syllabdosth available in?', 'Courses are available online across India. Professional bookings are currently live in Bengaluru, with more Karnataka cities coming soon.', 5)
on conflict do nothing;

insert into public.testimonials (id, name, role, quote, photo_url, sort) values
  ('t-anjali', 'Anjali R.', 'Nail Art graduate · Mysuru', 'I finished the course in six weeks and had my first paid client the same month. The pricing module alone paid for the fee.', 'https://images.unsplash.com/photo-1759840278361-f1adc75529a1?auto=format&fit=crop&crop=faces&w=240&h=240&q=75', 0),
  ('t-fathima', 'Fathima S.', 'Bridal Mehandi graduate · Bengaluru', 'The certificate gave customers confidence. I now take 8–10 bridal bookings every wedding season through Syllabdosth.', 'https://images.unsplash.com/photo-1552113125-81af17f36b57?auto=format&fit=crop&crop=faces&w=240&h=240&q=75', 1),
  ('t-kavya', 'Kavya P.', 'Saree Draping graduate · Hubballi', 'Classes were practical from day one. I learned 12 styles and now drape for events every weekend.', 'https://images.unsplash.com/photo-1463335361701-e90f4c5045d0?auto=format&fit=crop&crop=faces&w=240&h=240&q=75', 2)
on conflict do nothing;

insert into public.email_templates (key, name, subject, body) values
  ('enrollment_received', 'Course enquiry received (to learner)', 'We got your enquiry for {{course}}',
   E'Hi {{name}},\n\nThanks for your interest in {{course}}. Our team will call you on {{phone}} within one working day to confirm your batch.\n\n— Team Syllabdosth'),
  ('admin_new_enquiry', 'New enquiry (to admin)', 'New {{type}}: {{name}}',
   E'A new {{type}} was submitted on the website.\n\nName: {{name}}\nPhone: {{phone}}\nEmail: {{email}}\nDetails: {{details}}\n\nOpen the admin panel to follow up.'),
  ('application_received', 'Application received (to applicant)', 'Your {{type}} application',
   E'Hi {{name}},\n\nThanks for applying to join Syllabdosth as {{type}}. We review every application and reply within 3 working days.\n\n— Team Syllabdosth'),
  ('group_enquiry_received', 'Group enquiry received (to customer)', 'Your group booking enquiry',
   E'Hi {{name}},\n\nThanks for your group enquiry for {{people}} people on {{date}}. We will call you to plan the artists.\n\n— Team Syllabdosth'),
  ('notification', 'Notification email', '{{title}}', E'{{body}}\n\n{{link}}'),
  ('ticket_reply', 'Support ticket reply (to user)', 'Re: {{subject}}',
   E'Hi {{name}},\n\n{{reply}}\n\nYou can reply from your dashboard → Support.\n\n— Team Syllabdosth')
on conflict do nothing;

insert into public.sms_templates (key, name, body) values
  ('enrollment_received', 'Course enquiry received', 'Hi {{name}}, thanks for your enquiry for {{course}}. Syllabdosth will call you within 1 working day.'),
  ('booking_confirmed', 'Booking confirmed', 'Hi {{name}}, your booking for {{service}} on {{date}} is confirmed. - Syllabdosth'),
  ('live_class_reminder', 'Live class reminder', 'Reminder: {{title}} starts at {{time}}. Join: {{link}} - Syllabdosth')
on conflict do nothing;

-- ---------------------------------------------------------------- media storage bucket
-- Public bucket for images uploaded from the admin panel (CMS, courses, blog, faculty…).
-- The app also creates it automatically on the first upload.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'application/pdf'])
    on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
  end if;
end $$;
