import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cancelBookingAction } from '@/app/actions';
import { ServiceDetails, Timeline } from '@/components/booking';
import { InlineAction } from '@/components/forms';
import { Arrow, Section } from '@/components/ui';
import { getSiteSettings } from '@/lib/cms/content';
import { getCurrentUser } from '@/lib/auth';
import { getBooking, getProfessional, getServiceById } from '@/lib/data';
import { bookingStatusLabel, fmtDate, fmtTime } from '@/lib/format';

export const metadata: Metadata = { title: 'My booking request', robots: { index: false } };

export default async function BookingPage({ params }: { params: { id: string } }) {
  const [booking, site] = await Promise.all([getBooking(params.id), getSiteSettings()]);
  if (!booking) notFound();
  const [service, pro, user] = await Promise.all([getServiceById(booking.service_id), getProfessional(booking.professional_id), getCurrentUser()]);
  if (!service || !pro) notFound();
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const banner = {
    pending: ['bg-pending', 'Request pending confirmation', `Your request has been sent to ${pro.name}. They’ll contact you after reviewing the details.`],
    confirmed: ['bg-taupe', 'Appointment confirmed', `${pro.name} confirmed your appointment on ${fmtDate(booking.preferred_date)} at ${fmtTime(booking.preferred_time)}.`],
    completed: ['bg-soft', 'Completed', 'Hope it went beautifully!'],
    declined: ['bg-muted', 'Request declined', 'The professional could not take this booking.'],
    cancelled: ['bg-muted', 'Request cancelled', 'This request was cancelled.'],
  }[booking.status];

  return (
    <Section>
      <Link href={user ? '/dashboard' : '/services'} className="inline-flex items-center gap-2 text-[14px] font-semibold text-ink-deep hover:underline"><Arrow left /> Back</Link>
      <h1 className="h1 mt-4">My booking request</h1>
      <p className="body-l mt-3 text-ink-deep-muted">Here are the details of your service booking request.</p>
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <div className={`rounded-card p-6 ${banner[0]}`} role="status">
            <p className="text-[17px] font-semibold">{banner[1]}</p>
            <p className="mt-1 text-[14px] text-ink-deep">{banner[2]}</p>
          </div>
          <ServiceDetails service={service} pro={pro} price={booking.price_from} />
          <div className="card">
            <h2 className="font-serif text-[20px] font-bold">Request details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {[['Name', booking.name], ['Phone', booking.phone], ['Date', fmtDate(booking.preferred_date)], ['Time', fmtTime(booking.preferred_time)], ['Location', booking.location], ['Status', bookingStatusLabel[booking.status]]].map(([k, v]) => (
                <div key={k}><dt className="text-[13px] text-ink-soft">{k}</dt><dd className="font-semibold">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-5 text-[13px] text-ink-soft">Requirements</p>
            <p className="mt-1 rounded-xl bg-muted p-4 text-[15px]">{booking.requirements || 'None added.'}</p>
          </div>
        </div>
        <aside className="space-y-6">
          <Timeline status={booking.status} />
          <div className="rounded-card bg-soft p-6">
            <p className="font-semibold">Need help?</p>
            <p className="mt-1 text-[14px] text-ink-soft">Questions about this booking? Message us and we&apos;ll sort it out.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {site.whatsappUrl && <a href={site.whatsappUrl} target="_blank" rel="noreferrer" className="btn-dark btn-sm">WhatsApp support</a>}
              {site.phone && <a href={site.phoneHref} className="btn-secondary btn-sm">Call {site.phone}</a>}
            </div>
          </div>
          <div className="card space-y-3 !p-6">
            <Link href="/services" className="btn-primary w-full"><Arrow left /> Back to services</Link>
            {canCancel && (
              <div className="pt-2 text-center">
                <InlineAction action={cancelBookingAction} fields={{ id: booking.id }} variant="secondary">Cancel this request</InlineAction>
                <p className="mt-2 text-[12px] text-ink-soft">Free to cancel before the appointment.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </Section>
  );
}
