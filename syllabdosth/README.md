# Syllabdosth website

Next.js 14 (App Router) + Supabase (Postgres database + authentication) + Tailwind CSS.

- **Front end**: every screen from the Figma prototype, connected (see `SITEMAP.md`).
- **Back end**: Next.js server actions (`app/actions.ts`, `app/auth-actions.ts`, `app/dashboard-actions.ts`).
- **Database**: Supabase Postgres (`supabase/migrations/0001_schema.sql`, sample data in `supabase/seed.sql`).
- **Login**: email + password, Google, and phone OTP (SMS).
- **Roles**: learner/customer, professional, faculty, admin, each with its own dashboard.
- **Admin panel**: `/admin` — LMS-style panel (courses, lessons, students, quizzes, live classes, staff, blog, bookings,
  support, marketing, reports, CMS for every text and image, website/email/SMS settings, media library, AI assistant).
- **Payments**: not included yet. Course enrollment is an enquiry that your team follows up.

## 1. Run it locally (demo mode, no setup)

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no Supabase keys, the site runs in **demo mode**:
- sample courses, services, pros and blog posts
- forms work, but anything submitted lives in memory until the server restarts
- the login page shows **"Try a demo account"** buttons for all four roles

## 2. Connect the real database and login

1. Create a free project at https://supabase.com (region: Mumbai `ap-south-1`).
2. **SQL Editor** → run `supabase/migrations/0001_schema.sql`, then `supabase/seed.sql`, then
   `supabase/migrations/0002_course_images.sql` and **`supabase/migrations/0003_admin_panel.sql`** (admin panel tables,
   CMS, image storage). Already live? Just run `0003_admin_panel.sql` — it is safe to run more than once.
3. **Project Settings → API** → copy the keys into `.env.local` (copy `.env.example`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...        # server only, never share
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
4. **Authentication → URL Configuration**: Site URL = your domain; add `https://YOUR-DOMAIN/auth/callback`
   (and `http://localhost:3000/auth/callback`) to Redirect URLs.
5. Restart `npm run dev`. The demo banner disappears.
6. *(Recommended)* **Authentication → Email Templates**: so confirmation and reset links work even when opened
   on a different phone or browser, change the link in **Confirm signup** to
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/dashboard`
   and in **Reset password** to
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/account/reset-password`.
7. Sign up with your own email, then make yourself admin in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

### Login providers
| Method | Where to switch it on | What you need |
|---|---|---|
| Email + password | Authentication → Providers → Email (on by default) | For production email, add SMTP (e.g. Resend, Zoho) under Auth → SMTP |
| Google | Authentication → Providers → Google | OAuth client ID + secret from Google Cloud Console. Authorised redirect URI: `https://<project>.supabase.co/auth/v1/callback` |
| Phone OTP | Authentication → Providers → Phone | An SMS provider account: **MSG91** (best for India; needs DLT template registration), Twilio or Vonage. SMS is paid per message. |

## Admin panel

Log in with an admin account and open `/admin`. Everything is managed there — no need for the Supabase Table Editor.

- **Website content**: Admin → **CMS** edits every text and image on the home, about, contact, listing and legal pages
  and the footer. Course, category, service, blog, faculty and testimonial photos are uploaded on their own edit pages.
  The site shows its original content until you save a change; **Reset to original** brings it back.
- **Images** go to the Supabase Storage bucket `media` (public, created automatically) and are listed in **Media Library**.
- **Settings**: logos, favicon, SEO, announcement bar, maintenance mode, SMTP email, SMS details, add-ons.
  Passwords/API keys are stored in the database and never sent back to the browser.
- **Emails** (enquiry confirmations, admin alerts, notifications, ticket replies) are sent through the SMTP server in
  Email Settings. Login / password-reset emails are still sent by Supabase (set the same SMTP in Supabase → Auth → SMTP).
- **AI Assistant** needs an Anthropic API key (Addon settings, or `ANTHROPIC_API_KEY` in the environment).
- **Staff**: link a staff member's login account to give them admin access.
- Every change is recorded in **Activity Log**.

## Testing the database
`supabase/tests/` checks the schema, sign-up trigger and Row Level Security on a throwaway local Postgres:
```bash
createdb sd_test
psql -d sd_test -f supabase/tests/00_supabase_stub.sql      # fake Supabase roles + auth schema
psql -d sd_test -f supabase/migrations/0001_schema.sql
psql -d sd_test -f supabase/seed.sql
psql -d sd_test -f supabase/migrations/0003_admin_panel.sql
psql -d sd_test -f supabase/tests/10_rls_tests.sql          # every line should end in "| t"
```

### Full end-to-end test
`test-harness/` runs every page, form, login method and dashboard in a real browser against a local
Postgres with a Supabase stand-in (96 checks, including every admin page, CMS edits, image upload, quizzes,
live classes, tickets and certificates). See `test-harness/README.md`.

> Install with `npm ci` so the exact tested package versions in `package-lock.json` are used.

## 3. Deploy

Recommended: **Vercel** (free tier is fine to start).
1. Push this folder to GitHub.
2. vercel.com → New Project → import the repo.
3. Add the four environment variables (set `NEXT_PUBLIC_SITE_URL` to `https://www.syllabdosth.com`).
4. Point the domain to Vercel, and update the Supabase redirect URLs.

## How the pieces fit

```
app/(home)/page.tsx          Home (dark header)
app/(main)/...               All other pages (light header)
app/actions.ts               Public forms: booking, group, enroll, apply, newsletter, contact
app/auth-actions.ts          Email / Google / phone OTP login, sign-out, demo login
app/dashboard-actions.ts     Pro / faculty / admin actions (each re-checks role + ownership)
lib/data.ts                  The only place that talks to the database (demo fallback built in)
lib/auth.ts                  Current user, role checks, which dashboard to open
lib/demo-data.ts             Sample content (also the source for supabase/seed.sql)
middleware.ts                Keeps the login session fresh; protects /dashboard, /admin, /account
supabase/migrations/         Database tables, enums, profile trigger, Row Level Security
```

**Security**: Row Level Security is on for every table. The public key can only read the catalogue
and the user's own rows. All writes run on the server with the service-role key, after the server
checks the user's role (and for pros/faculty, that the record is theirs). Booking pages use
unguessable IDs, so a guest's booking link acts as their private access link.

## Content to replace before launch
- Logo: done. Files in `public/` (`logo-forest.png` for light backgrounds, `logo-white.png` for dark).
- Photos: change them in Admin → CMS (and on each course/service/blog/faculty page). The built-in defaults live in `lib/images.ts`. They are free Unsplash photos (commercial use allowed) loaded from
  Unsplash. To use your own, drop the file in `public/photos/` and put its path in `lib/images.ts`.
  A course's `image_url` in Supabase overrides the default photo for that course.
- Testimonials on the home page are samples.
- Terms and privacy text in `app/(main)/legal/[doc]/page.tsx`.
- Contact details in `lib/config.ts`.

## Look and feel
- Colours (black #0B0B0B and off-white #F2F0EB; token names noir/paper/pearl/stone/taupe): `tailwind.config.ts`.
- Type: Inter Tight (uppercase headings), Italiana (thin serif capitals, class `accent`), Cormorant Garamond (serif), Inter (body). Shared styles and all animations: `app/globals.css`.
- Glass: `.liquid-glass` (on dark/photos) and `.liquid-glass-light` (on light) in `app/globals.css`.
- Motion helpers (scroll reveal, word-by-word headings, count-up numbers, parallax, photo fallback): `components/motion.tsx`.
  Logo intro on first visit: `components/intro.tsx`. Use `data-reveal="mask"` for a wipe-up photo reveal.
- Motion (`components/luxe.tsx`): smooth scrolling + hairline scroll-progress line. Off on touch screens and for reduce-motion.
- Home signature sections: `components/hero-reveal.tsx` (photo opens to full-bleed on scroll), `components/manifesto.tsx` (words light up), 
  `components/craft-story.tsx` (split-screen story; content in `lib/images.ts` → `craftStory`).
- Profile photos (DPs) for faculty and testimonials are placeholder models — replace in `lib/images.ts`.
  Add `data-reveal` to any element to make it fade up when scrolled into view.
- Animations switch off automatically for visitors who turn on "reduce motion" on their device.

## Adding content
Everything is added and edited in the admin panel (`/admin`): courses, categories, lessons, services, professionals,
faculty, blog posts, FAQs, testimonials, offers, page text and images.

## Next steps (not built yet)
- Razorpay payments for course fees (Payment Gateway, Wallet, Payout, Referral, Offline Payment menus)
- WhatsApp / SMS sending (templates are ready in the admin panel)

## Check the live Supabase project

After filling `.env.local` with your real keys, run:

```bash
npm run check:supabase
```

It checks the keys, login providers, that all 13 site tables and 19 admin-panel tables exist, the image bucket, that the catalogue is visible,
that private data is locked (RLS), that the server can save forms, and that sign-up creates a profile.
It creates one temporary test user and deletes it again. `✘` = must fix, `!` = worth a look.
