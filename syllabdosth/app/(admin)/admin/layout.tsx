import type { Metadata } from 'next';
import { AdminFrame } from '@/components/admin/frame';
import { countRecords } from '@/lib/admin/crud';
import { requireRole } from '@/lib/auth';
import { getSiteSettings } from '@/lib/cms/content';
import { isDemo } from '@/lib/config';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Admin · Syllabdosth' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

async function safeCount(t: string, f: Record<string, string>) {
  try { return await countRecords(t, f); } catch { return 0; }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(['admin'], '/admin');
  const [site, enq, subs, pend, groups, apps, tickets, msgs, reviews] = await Promise.all([
    getSiteSettings(),
    safeCount('enrollments', { status: 'new' }), safeCount('submissions', { status: 'submitted' }), safeCount('bookings', { status: 'pending' }),
    safeCount('group_enquiries', { status: 'new' }), safeCount('applications', { status: 'new' }), safeCount('support_tickets', { status: 'open' }),
    safeCount('contact_messages', { status: 'new' }), safeCount('course_reviews', { approved: 'false' }),
  ]);
  return (
    <AdminFrame
      logo={site.logoLight}
      demo={isDemo}
      user={{ name: user.profile.full_name || 'Admin', email: user.email ?? user.profile.phone ?? '' }}
      badges={{ enrollments: enq, submissions: subs, bookings: pend + groups, tickets: tickets + msgs }}
      alerts={[
        { label: 'New course enquiries', count: enq, href: '/admin/enrollments?status=new' },
        { label: 'Bookings to confirm', count: pend, href: '/admin/bookings?status=pending' },
        { label: 'New group enquiries', count: groups, href: '/admin/group-enquiries?status=new' },
        { label: 'New applications', count: apps, href: '/admin/applications?status=new' },
        { label: 'Open support tickets', count: tickets, href: '/admin/tickets?status=open' },
        { label: 'New contact messages', count: msgs, href: '/admin/messages?status=new' },
        { label: 'Submissions to grade', count: subs, href: '/admin/submissions?status=submitted' },
        { label: 'Reviews to approve', count: reviews, href: '/admin/reviews?approved=false' },
      ]}
    >
      {children}
    </AdminFrame>
  );
}
