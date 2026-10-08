import type { Metadata } from 'next';
import { todayIST } from '@/lib/format';
import Link from 'next/link';
import { groupEnquiryAction } from '@/app/actions';
import { ActionForm, Field, SubmitButton, TextArea } from '@/components/forms';
import { Arrow, Section } from '@/components/ui';

export const metadata: Metadata = { title: 'Plan a group booking' };

export default function GroupBookingPage() {
  const today = todayIST();
  return (
    <Section>
      <Link href="/services" className="inline-flex items-center gap-2 text-[14px] font-semibold text-ink-deep hover:underline"><Arrow left /> Back to services</Link>
      <h1 className="h1 mt-4">Plan a group booking</h1>
      <p className="body-l mt-3 max-w-3xl text-ink-deep-muted">Tell us a little about your group and what you need. We’ll get back to you with availability and pricing within one working day.</p>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="card">
          <h2 className="h3 mb-6">Group enquiry</h2>
          <ActionForm action={groupEnquiryAction} className="grid gap-5 sm:grid-cols-2">
            <Field label="Your name" name="name" required autoComplete="name" />
            <Field label="Phone number" name="phone" type="tel" required autoComplete="tel" />
            <Field label="Email address" name="email" type="email" required autoComplete="email" />
            <Field label="Number of people" name="people" type="number" min={2} required inputMode="numeric" />
            <Field label="Preferred date" name="preferred_date" type="date" required min={today} />
            <Field label="Service / event type" name="event_type" required placeholder="e.g. Bridal party mehandi" />
            <Field label="Location" name="location" required placeholder="Venue, area & city" className="sm:col-span-2" />
            <TextArea label="Tell us about your requirements" name="requirements" rows={5} className="sm:col-span-2" />
            <div className="sm:col-span-2"><SubmitButton className="w-full">Send group enquiry</SubmitButton></div>
          </ActionForm>
        </div>
        <aside className="card h-fit">
          <h2 className="h3">How it works</h2>
          <p className="mt-2 text-ink-soft">Group bookings are handled by our team, so we can understand your requirements and coordinate the right professionals.</p>
          <ul className="mt-5 space-y-3">
            {[['Flexible group sizes', 'Tell us how many people need the service and we’ll help plan it.'], ['Availability & pricing', 'We confirm availability and discuss the final pricing with you.'], ['No payment now', 'This enquiry is only a request. Payment is handled after the details are confirmed.']].map(([t, d]) => (
              <li key={t} className="rounded-2xl bg-muted p-4"><p className="font-semibold">{t}</p><p className="mt-1 text-[14px] text-ink-soft">{d}</p></li>
            ))}
          </ul>
        </aside>
      </div>
    </Section>
  );
}
