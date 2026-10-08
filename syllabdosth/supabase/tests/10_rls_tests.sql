-- Security tests: run on a throwaway Postgres (see README "Testing the database"), NOT on your live project — it inserts and deletes test rows.
\set ON_ERROR_STOP 0
\pset footer off
-- Fixtures (as postgres = migration owner)
insert into auth.users (id,email,raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','learner@test.in','{"full_name":"Priya L"}'),
 ('22222222-2222-2222-2222-222222222222','other@test.in','{"name":"Google Name"}');
insert into auth.users (id,phone) values ('33333333-3333-3333-3333-333333333333','919900112233');
select 'T1 trigger created profiles' t, count(*)=3 pass from public.profiles;
select 'T2 full_name from metadata' t, (select full_name from profiles where email='learner@test.in')='Priya L' and (select full_name from profiles where email='other@test.in')='Google Name' pass;
select 'T3 default role learner' t, bool_and(role='learner') pass from profiles;
insert into bookings (service_id,professional_id,customer_id,name,phone,preferred_date,preferred_time,location,price_from)
 select s.id,p.id,'11111111-1111-1111-1111-111111111111','Priya','9845012345','2026-12-01','10:00','Jayanagar',s.price_from from services s join professionals p on s.id=any(p.service_ids) limit 1;
insert into bookings (service_id,professional_id,customer_id,name,phone,preferred_date,preferred_time,location,price_from)
 select s.id,p.id,'22222222-2222-2222-2222-222222222222','Other','9845099999','2026-12-02','11:00','Whitefield',s.price_from from services s join professionals p on s.id=any(p.service_ids) limit 1;
insert into enrollments (course_id,user_id,name,phone,email,mode) select id,'11111111-1111-1111-1111-111111111111','Priya','9845012345','l@t.in','Online' from courses limit 1;
insert into group_enquiries (name,phone,email,people,preferred_date,event_type,location) values ('G','9845012345','g@t.in',10,'2026-12-01','Mehandi','Koramangala');
insert into contact_messages (name,phone,email,topic,message) values ('C','9845012345','c@t.in','General','Hello there');
insert into newsletter_subscribers values ('a@b.in');
insert into applications (type,name,phone,email,city,skill) values ('faculty','A','9845012345','a@t.in','Mysuru','Tailoring');
update courses set published=false where slug=(select slug from courses order by slug limit 1);
update professionals set verified=false where slug=(select slug from professionals order by slug limit 1);

-- ---------- anon (browser, not logged in)
set role anon;
select 'A1 anon reads published courses' t, count(*)=24 pass from courses;
select 'A2 anon sees only verified pros' t, count(*)=5 pass from professionals;
select 'A3 anon reads categories/services/blog' t, (select count(*) from categories)=6 and (select count(*) from services)=8 and (select count(*) from blog_posts)=3 pass;
select 'A4 anon sees no bookings' t, count(*)=0 pass from bookings;
select 'A5 anon sees no profiles' t, count(*)=0 pass from profiles;
select 'A6 anon sees no enquiries/apps/messages/subscribers' t, (select count(*) from group_enquiries)+(select count(*) from applications)+(select count(*) from contact_messages)+(select count(*) from newsletter_subscribers)+(select count(*) from enrollments)=0 pass;
\echo 'A7 anon insert booking (expect RLS error):'
insert into bookings (service_id,professional_id,name,phone,preferred_date,preferred_time,location,price_from) select service_id,professional_id,'x','9845012345','2026-12-01','10:00','x',1 from (select null::text service_id, null::text professional_id) z;
\echo 'A8 anon insert newsletter (expect RLS error):'
insert into newsletter_subscribers values ('spam@x.in');
\echo 'A9 anon update course price (expect 0 rows):'
update courses set price=1;
reset role;

-- ---------- authenticated learner
set role authenticated;
set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select 'L1 learner sees own profile only' t, count(*)=1 pass from profiles;
select 'L2 learner sees own booking only' t, count(*)=1 and bool_and(customer_id='11111111-1111-1111-1111-111111111111') pass from bookings;
select 'L3 learner sees own enrollment' t, count(*)=1 pass from enrollments;
\echo 'L4 learner promotes self to admin (expect 0 rows):'
update profiles set role='admin' where id=auth.uid();
\echo 'L5 learner edits booking status (expect 0 rows):'
update bookings set status='confirmed';
select 'L6 learner cannot read group/apps/messages' t, (select count(*) from group_enquiries)+(select count(*) from applications)+(select count(*) from contact_messages)=0 pass;
reset role; reset request.jwt.claims;
select 'L7 learner still learner after attempt' t, role='learner' pass from profiles where id='11111111-1111-1111-1111-111111111111';

-- ---------- service role (server)
set role service_role;
select 'S1 service role sees all bookings' t, count(*)=2 pass from bookings;
update bookings set status='confirmed' where customer_id='22222222-2222-2222-2222-222222222222';
select 'S2 service role can write' t, count(*)=1 pass from bookings where status='confirmed';
insert into newsletter_subscribers values ('a@b.in') on conflict (email) do nothing;
select 'S3 newsletter upsert idempotent' t, count(*)=1 pass from newsletter_subscribers;
reset role;

-- ---------- constraints
\echo 'C1 group < 2 people (expect check violation):'
insert into group_enquiries (name,phone,email,people,preferred_date,event_type,location) values ('G','9','g',1,'2026-12-01','x','y');
\echo 'C2 bad application type (expect check violation):'
insert into applications (type,name,phone,email,city,skill) values ('admin','A','9','a','b','c');
\echo 'C3 delete auth user cascades profile, nulls booking customer:'
delete from auth.users where id='22222222-2222-2222-2222-222222222222';
select 'C3 result' t, (select count(*) from profiles where id='22222222-2222-2222-2222-222222222222')=0 and (select count(*) from bookings where customer_id is null)=1 pass;

-- ---------- admin panel tables (0003_admin_panel.sql)
\echo 'Run supabase/migrations/0003_admin_panel.sql before this block.'
set role service_role;
insert into site_content (key, value) values ('settings.email', '{"pass":"secret"}') on conflict (key) do update set value = excluded.value;
insert into support_tickets (id, user_id, name, subject) values ('tk-test', '11111111-1111-1111-1111-111111111111', 'L', 'Help') on conflict do nothing;
insert into faqs (id, question, answer, published) values ('faq-hidden', 'Hidden?', 'Draft', false) on conflict do nothing;
reset role;
set role anon; set request.jwt.claims = '{"role":"anon"}';
select 'A1 anon cannot read site settings (SMTP password)' t, count(*)=0 pass from site_content;
select 'A2 anon cannot read tickets, staff, activity, templates, media' t, (select count(*) from support_tickets)+(select count(*) from staff)+(select count(*) from activity_log)+(select count(*) from email_templates)+(select count(*) from media)=0 pass;
select 'A3 anon reads only published FAQs' t, count(*) filter (where not published)=0 and count(*)>0 pass from faqs;
reset role; reset request.jwt.claims;
set role authenticated; set request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select 'A4 learner reads own ticket only' t, count(*)=1 pass from support_tickets;
\echo 'A5 learner edits a ticket (expect 0 rows):'
update support_tickets set status='closed';
reset role; reset request.jwt.claims;
select 'A6 ticket unchanged' t, status='open' pass from support_tickets where id='tk-test';
