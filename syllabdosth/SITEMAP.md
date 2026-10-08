# Syllabdosth — site map & user flows

Every page below is built, and every button leads somewhere real. This file replaces the
unconnected Figma prototype links.

## Public pages

| Page | URL | Main buttons → go to |
|---|---|---|
| Home | `/` | Explore courses → `/courses` · Book a service → `/services` · Course card → `/courses/[slug]` · Service card → `/services/[slug]` · Enquire for a group → `/group-booking` · Apply as faculty → `/apply/faculty` · Register as a pro → `/apply/professional` · Blog card → `/blog/[slug]` · Subscribe (saves email) |
| Courses | `/courses` | Category chips, search, level/duration/price filters, sort · Course card → `/courses/[slug]` · Enquire for a group → `/group-booking` |
| Course detail | `/courses/[slug]` | Enroll now → `/courses/[slug]/enroll` · Ask on WhatsApp · Related course → `/courses/[slug]` |
| Enroll | `/courses/[slug]/enroll` | Send → saves enquiry → `/courses/[slug]/enroll/sent` |
| Enroll sent | `/courses/[slug]/enroll/sent` | My dashboard → `/dashboard` · Browse more → `/courses` |
| Services | `/services` | Category chips · Book service → `/services/[slug]` · Plan a group booking → `/group-booking` |
| Book a service | `/services/[slug]` | Choose professional · View profile → `/pros/[slug]` · Request booking → saves booking → `/bookings/[id]/sent` |
| Booking sent | `/bookings/[id]/sent` | View my request → `/bookings/[id]` · Back to services → `/services` |
| My booking request | `/bookings/[id]` | Live status + timeline · WhatsApp / call support · Cancel request · Back to services |
| Professional profile | `/pros/[slug]` | Book service → `/services/[slug]` |
| Group booking | `/group-booking` | Send → saves enquiry → `/group-booking/sent` |
| Blog / article | `/blog`, `/blog/[slug]` | Explore courses → `/courses` · Keep reading → `/blog/[slug]` |
| Apply | `/apply/faculty`, `/apply/professional` | Send → saves application → `/apply/sent` → Create account → `/signup` |
| About · Contact · Help · Legal | `/about`, `/contact`, `/help`, `/legal/terms`, `/legal/privacy` | Contact form saves a message |
| Verify a certificate | `/certificates`, `/certificates/[code]` | Enter a certificate number → shows the learner, course and issue date |
| Not found | any bad link | Go home / Browse courses / Book a service |

## Accounts

| Page | URL | Notes |
|---|---|---|
| Log in | `/login` | Google · Email + password · Phone OTP (SMS). Redirects to the right dashboard for the role. |
| Sign up | `/signup` | Same three methods. Everyone starts as **learner**. |
| Forgot / reset password | `/forgot-password` → email link → `/account/reset-password` | |

## Dashboards (login required)

| Role | URL | What they can do |
|---|---|---|
| Learner / customer | `/dashboard` | Tabs: Overview (bookings, enquiries, profile) · My learning (live classes, lessons, quizzes → `/dashboard/quiz/[id]`, assignments, course review) · Certificates · Notifications · Support (tickets → `/dashboard/support/[id]`) |
| Professional | `/dashboard/pro` | New requests → **Accept / Decline**, upcoming → **Mark completed**, history, link to public listing |
| Faculty | `/dashboard/faculty` | Enquiries for their courses → **Mark contacted / enrolled**, grade assignments, their live classes, their courses |
| Admin | `/admin` | Full admin panel — see below |

## Admin panel (`/admin`)

Dark sidebar + top bar (Clear cache · Add new · view site · alerts · account). Every list has search, filters,
inline status changes, CSV export, edit and delete (with confirm).

| Menu | Pages |
|---|---|
| Dashboard | `/admin` — stat cards, activity chart (7 / 30 days), recent enquiries, most-enquired courses, upcoming live classes, open tickets |
| Enrollments | `/admin/enrollments` — mark **Enrolled** to unlock the learner's live classes, quizzes and assignments |
| Course ▾ | `/admin/courses` (+ add / edit with cover upload, curriculum, outcomes) · `/admin/categories` · `/admin/lessons` · `/admin/reviews` · `/admin/certificates` |
| Manage Students | `/admin/students` (block / unblock, role, enrolments, certificates) |
| Quiz & Assignment | `/admin/quizzes` · `/admin/assignments` · `/admin/submissions` (grade) |
| Manage Instructors ▾ | `/admin/instructors` · `/admin/applications` |
| Manage Organisation | `/admin/organisations` — franchises, training partners, colleges, corporate clients |
| Live Classes | `/admin/live-classes` |
| Staff ▾ | `/admin/staff` — linking a login gives admin access |
| Media Library | `/admin/media` — upload, copy link, describe, delete |
| AI Assistant | `/admin/ai` — needs an Anthropic API key (Addon settings) |
| Blog ▾ | `/admin/blog` |
| Services & Bookings ▾ | `/admin/bookings` · `/admin/group-enquiries` · `/admin/services` · `/admin/professionals` |
| Notification ▾ | `/admin/notifications` — to everyone, a role, or one person; optional email |
| Support ▾ | `/admin/tickets` (reply thread) · `/admin/messages` · `/admin/faqs` |
| Marketing ▾ | `/admin/offers` · `/admin/testimonials` · `/admin/subscribers` · `/admin/settings/announcement` |
| Reports ▾ | `/admin/reports/enrolments` · `bookings` · `courses` · `students` (date range, chart, CSV) |
| CMS ▾ | `/admin/cms` → Home, About, Contact, Courses/Services/Blog/Help pages, Footer, Terms, Privacy — every text and image |
| Website Settings ▾ | `/admin/settings/general` · `branding` (logos, favicon) · `seo` · `maintenance` |
| Email Settings ▾ | `/admin/settings/email` (SMTP + test email) · `/admin/email-templates` |
| SMS & OTP ▾ | `/admin/settings/sms` · `/admin/sms-templates` · `/admin/login-methods` |
| System Settings ▾ | `/admin/users` · `/admin/activity` · `/admin/utility#system` |
| Addon | `/admin/settings/addons` — WhatsApp button, Google Analytics, Meta Pixel, AI |
| Utility ▾ | `/admin/utility` — export any table, clear cache, download a content backup |

Not built yet (by choice): online payments — Payment Gateway, Wallet, Payout, Referral, Offline Payment.

## Key flows

```
Customer:  Home → Services → Book a service → Request booking → Booking sent → My booking request
                                                                    ↓
Professional:                               Pro dashboard → Accept → customer sees "Confirmed"

Learner:   Home → Courses → Course detail → Enroll → Enroll sent → Admin/Faculty mark contacted → enrolled
           → Dashboard › My learning: join live class, take quiz, submit assignment → faculty grades → certificate issued

Content:   Admin › CMS / Settings → Save → website updates immediately (Reset to original is always available)

Grow:      Apply as faculty / Register as pro → Admin approves → role upgraded → faculty / pro dashboard
```
