import Link from 'next/link';
import { bookingStatusLabel, fmtDate, fmtTime, inr } from '@/lib/format';
import type { Booking, BookingStatus, Professional, Service } from '@/lib/types';
import { Avatar, Initials } from './ui';

export function BookingSummary({ booking, service, pro }: { booking: Booking; service: Service; pro: Professional }) {
  const rows: [string, string][] = [
    ['Service', service.title],
    ['Professional', pro.name],
    ['Preferred date', fmtDate(booking.preferred_date)],
    ['Preferred time', fmtTime(booking.preferred_time)],
    ['Location', booking.location],
    ['Starting price', inr(booking.price_from)],
    ['Reference', booking.id.slice(0, 8).toUpperCase()],
  ];
  return (
    <div className="card">
      <h2 className="font-serif text-[20px] font-bold">Booking summary</h2>
      <dl className="mt-4 divide-y divide-line text-[15px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-6 py-3"><dt className="text-ink-soft">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
        ))}
      </dl>
    </div>
  );
}

export function ServiceDetails({ service, pro, price }: { service: Service; pro: Professional; price: number }) {
  return (
    <div className="card">
      <h2 className="font-serif text-[20px] font-bold">Service details</h2>
      <div className="mt-5 flex gap-5">
        <Initials text={service.initials} size={72} />
        <div>
          <p className="h3">{service.title}</p>
          <p className="mt-1 text-[14px] text-ink-soft">{service.summary}</p>
          <p className="mt-3 flex flex-wrap items-center gap-3">
            <span className="font-serif text-[24px] font-bold">{inr(price)}</span>
            <span className="whitespace-nowrap rounded-full bg-pending px-3 py-1 text-[12px] font-semibold">No payment taken</span>
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-line pt-5">
        <Avatar text={pro.initials} src={pro.photo_url ?? undefined} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{pro.name}</p>
          <p className="text-[13px] text-ink-soft">{pro.title} · ✓ Verified professional · {pro.city}</p>
        </div>
        <Link href={`/pros/${pro.slug}`} className="btn-secondary btn-sm">View profile</Link>
      </div>
    </div>
  );
}

const steps: { key: BookingStatus[]; title: string; detail: string }[] = [
  { key: ['pending', 'confirmed', 'completed'], title: 'Request sent', detail: 'Your request was received and sent to the professional.' },
  { key: ['confirmed', 'completed'], title: 'Professional reviewing', detail: 'They’ll call you to confirm the details.' },
  { key: ['confirmed', 'completed'], title: 'Appointment confirmed', detail: 'Updated once the professional confirms the booking.' },
];

export function Timeline({ status }: { status: BookingStatus }) {
  if (status === 'cancelled' || status === 'declined') {
    return (
      <div className="card">
        <h2 className="h3">Request {status}</h2>
        <p className="mt-2 text-ink-soft">{status === 'declined' ? 'The professional could not take this booking. Try another date or professional.' : 'You cancelled this request.'}</p>
        <Link href="/services" className="btn-primary mt-5">Book another service</Link>
      </div>
    );
  }
  // index of the step currently in progress
  const current = status === 'pending' ? 1 : 3;
  return (
    <div className="card">
      <h2 className="h3">Request timeline</h2>
      <ol className="mt-6 space-y-6">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.title} className="flex gap-4">
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${done || active ? 'bg-taupe text-ink' : 'border-[1.5px] border-line bg-white text-ink'}`} aria-hidden>
                {done ? '✓' : active ? '…' : i + 1}
              </span>
              <div>
                <p className={`font-semibold ${!done && !active ? 'text-ink-soft' : ''}`}>{s.title}{active && <span className="sr-only"> (in progress)</span>}</p>
                <p className="text-[14px] text-ink-soft">{s.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-[13px] font-semibold">Status: {bookingStatusLabel[status]}</p>
    </div>
  );
}
