import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookingSummary } from '@/components/booking';
import { Arrow, Avatar, Section } from '@/components/ui';
import { getBooking, getProfessional, getServiceById } from '@/lib/data';

export const metadata: Metadata = { title: 'Booking request sent', robots: { index: false } };

export default async function BookingSent({ params }: { params: { id: string } }) {
  const booking = await getBooking(params.id);
  if (!booking) notFound();
  const [service, pro] = await Promise.all([getServiceById(booking.service_id), getProfessional(booking.professional_id)]);
  if (!service || !pro) notFound();
  return (
    <Section>
      <Link href="/services" className="inline-flex items-center gap-2 text-[14px] font-semibold text-ink-deep hover:underline"><Arrow left /> Back to services</Link>
      <h1 className="h1 mt-4">Booking request sent</h1>
      <p className="body-l mt-3 max-w-3xl text-ink-deep-muted">{pro.name} will review your details and call you to confirm the appointment.</p>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <div className="card text-center">
            <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-taupe text-2xl" aria-hidden>✓</span>
            <h2 className="h2 mt-5">Your request has been sent!</h2>
            <p className="mt-3 text-ink-soft">Your booking request for <strong className="text-ink">{service.title}</strong> with <strong className="text-ink">{pro.name}</strong> was received. No payment has been taken.</p>
            <span className="mt-4 inline-flex rounded-full bg-pending px-4 py-1.5 text-[13px] font-semibold">Pending confirmation</span>
          </div>
          <BookingSummary booking={booking} service={service} pro={pro} />
          <div className="card">
            <h2 className="font-serif text-[20px] font-bold">What happens next?</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] text-ink-soft">
              <li>{pro.name} receives your request.</li>
              <li>They review your date, time and requirements.</li>
              <li>They call you on {booking.phone} to confirm.</li>
              <li>Final details and price are agreed before the appointment.</li>
            </ol>
          </div>
        </div>
        <aside className="card h-fit space-y-4">
          <h2 className="h3">Request details</h2>
          <div className="flex items-center gap-4 rounded-2xl bg-noir p-5 text-white">
            <Avatar text={pro.initials} />
            <div><p className="font-semibold">{pro.name}</p><p className="text-[13px] text-ink-dark-muted">Verified professional · {pro.city}</p></div>
          </div>
          <Link href={`/bookings/${booking.id}`} className="btn-primary w-full">View my request</Link>
          <Link href="/services" className="btn-dark w-full">Back to services</Link>
          <p className="text-center text-[13px] text-ink-soft">Save this page — the link lets you check or cancel your request anytime.</p>
        </aside>
      </div>
    </Section>
  );
}
