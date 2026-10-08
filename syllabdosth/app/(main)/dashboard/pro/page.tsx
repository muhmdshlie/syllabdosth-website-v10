import type { Metadata } from 'next';
import Link from 'next/link';
import { proSetBookingStatus } from '@/app/dashboard-actions';
import { DashboardShell, Panel, StatGrid, Table } from '@/components/dashboard';
import { InlineAction } from '@/components/forms';
import { Avatar, StatusPill } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { getProfessionalForUser, listBookings, listServices } from '@/lib/data';
import { bookingStatusLabel, fmtDate, fmtTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Professional dashboard' };

export default async function ProDashboard() {
  const user = await requireRole(['professional'], '/dashboard/pro');
  const pro = await getProfessionalForUser(user.id);
  if (!pro) {
    return (
      <DashboardShell user={user} title="Professional dashboard">
        <Panel title="Your listing is being set up">
          <p className="text-ink-soft">Your account is approved as a professional, but no public listing is linked yet. Our team links it after verification — usually within 2 working days.</p>
          <Link href="/contact" className="btn-primary mt-5">Contact support</Link>
        </Panel>
      </DashboardShell>
    );
  }
  const [bookings, services] = await Promise.all([listBookings({ professionalId: pro.id }), listServices()]);
  const svc = (id: string) => services.find((s) => s.id === id)?.title ?? 'Service';
  const pending = bookings.filter((b) => b.status === 'pending');
  const confirmed = bookings.filter((b) => b.status === 'confirmed');

  const rows = (list: typeof bookings, actions: boolean) => list.map((b) => [
    <div key="c"><p className="font-semibold">{b.name}</p><a href={`tel:${b.phone.replace(/\s/g, '')}`} className="text-[13px] underline">{b.phone}</a></div>,
    svc(b.service_id),
    <div key="w"><p>{fmtDate(b.preferred_date)}, {fmtTime(b.preferred_time)}</p><p className="text-[13px] text-ink-soft">{b.location}</p></div>,
    <p key="r" className="max-w-[240px] text-[13px] text-ink-soft">{b.requirements || '—'}</p>,
    actions ? (
      <div key="a" className="flex flex-wrap gap-2">
        {b.status === 'pending' && <>
          <InlineAction action={proSetBookingStatus} fields={{ id: b.id, status: 'confirmed' }} variant="primary">Accept</InlineAction>
          <InlineAction action={proSetBookingStatus} fields={{ id: b.id, status: 'declined' }}>Decline</InlineAction>
        </>}
        {b.status === 'confirmed' && <InlineAction action={proSetBookingStatus} fields={{ id: b.id, status: 'completed' }} variant="dark">Mark completed</InlineAction>}
      </div>
    ) : <StatusPill key="s" status={b.status} label={bookingStatusLabel[b.status]} />,
  ]);

  return (
    <DashboardShell user={user} title={pro.name}>
      <StatGrid items={[['New requests', pending.length], ['Upcoming', confirmed.length], ['Completed', bookings.filter((b) => b.status === 'completed').length], ['Rating', `★ ${pro.rating}`]]} />
      <Panel title="New booking requests">
        <Table head={['Customer', 'Service', 'When & where', 'Requirements', 'Respond']} rows={rows(pending, true)} empty="No new requests right now. We’ll show them here the moment a customer books you." />
      </Panel>
      <Panel title="Upcoming appointments">
        <Table head={['Customer', 'Service', 'When & where', 'Requirements', '']} rows={rows(confirmed, true)} empty="Nothing confirmed yet." />
      </Panel>
      <Panel title="History">
        <Table head={['Customer', 'Service', 'When & where', 'Requirements', 'Status']} rows={rows(bookings.filter((b) => !['pending', 'confirmed'].includes(b.status)), false)} empty="Past bookings will appear here." />
      </Panel>
      <Panel title="Your public listing" action={<Link href={`/pros/${pro.slug}`} className="btn-secondary btn-sm">View listing</Link>}>
        <div className="flex items-center gap-4">
          <Avatar text={pro.initials} size={56} dark />
          <div><p className="font-semibold">{pro.name}</p><p className="text-[14px] text-ink-soft">{pro.title} · {pro.city} · {pro.service_ids.map(svc).join(', ')}</p></div>
        </div>
        <p className="mt-4 text-[14px] text-ink-soft">To change your services, prices or photos, message the Syllabdosth team.</p>
      </Panel>
    </DashboardShell>
  );
}
