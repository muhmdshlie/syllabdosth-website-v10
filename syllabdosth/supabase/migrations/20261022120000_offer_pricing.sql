-- ============================================================================
-- Promotional course pricing on offers (badge, offer price, start date).
-- Run after 0003_admin_panel.sql. Safe to re-run. Adds columns only: no data
-- is changed, and course prices are never touched.
--
--   badge       short promo label shown on the course, e.g. 'DIWALI SPECIAL OFFER'
--   offer_price promotional price in whole rupees for ONE course (course_id
--               must be set). The site shows it only while it is below that
--               course's current price; otherwise the normal price is shown.
--   starts_on   first day the offer is shown (null = straight away)
--   valid_until existing column, now the last day the offer is shown
--
-- Permissions are unchanged: the public can read active offers only
-- ("public read" policy from 0003); all writes go through the server
-- (service role) from Admin → Offers & Coupons, which is admin-only.
--
-- Rollback (removes the promo fields; existing offers keep working):
--   alter table public.offers drop constraint if exists offers_offer_price_positive;
--   alter table public.offers drop constraint if exists offers_offer_price_needs_course;
--   alter table public.offers drop constraint if exists offers_dates_in_order;
--   alter table public.offers drop constraint if exists offers_badge_length;
--   alter table public.offers drop column if exists offer_price;
--   alter table public.offers drop column if exists starts_on;
--   alter table public.offers drop column if exists badge;
-- ============================================================================

alter table public.offers add column if not exists badge text not null default '';
alter table public.offers add column if not exists offer_price integer;
alter table public.offers add column if not exists starts_on date;

alter table public.offers drop constraint if exists offers_offer_price_positive;
alter table public.offers add constraint offers_offer_price_positive
  check (offer_price is null or offer_price > 0);

-- A rupee price only makes sense against one course's price.
alter table public.offers drop constraint if exists offers_offer_price_needs_course;
alter table public.offers add constraint offers_offer_price_needs_course
  check (offer_price is null or course_id is not null);

alter table public.offers drop constraint if exists offers_dates_in_order;
alter table public.offers add constraint offers_dates_in_order
  check (starts_on is null or valid_until is null or starts_on <= valid_until);

alter table public.offers drop constraint if exists offers_badge_length;
alter table public.offers add constraint offers_badge_length
  check (char_length(badge) <= 40);

create index if not exists offers_course_idx on public.offers (course_id) where active;
