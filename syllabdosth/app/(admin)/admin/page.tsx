import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart, Sparkline } from '@/components/admin/charts';
import { Icon } from '@/components/admin/icons';
import { fmtDateTime, fmtDay, StatusBadge } from '@/components/admin/ui';
import { relationOptions } from '@/lib/admin/crud';
import { dashboardMetrics } from '@/lib/admin/metrics';

export const metadata: Metadata = { title: 'Dashboard' };

const C = { green: '#27AE7A', orange: '#F4A51C', red: '#F2603E', indigo: '#4F5BD5' };

export default async function AdminDashboard({ searchParams }: { searchParams: { range?: string } }) {
  const range = searchParams.range === '30' ? 30 : 7;
  const [m, opts] = await Promise.all([dashboardMetrics(range), relationOptions(['courses'])]);
  const course = (id: unknown) => opts.courses?.find((o) => o.value === String(id))?.label ?? '—';
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Dashboard</h1>
      {/* stat cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Enrolments" value={m.cards.enrollments.total} month={m.cards.enrollments.month} spark={m.cards.enrollments.spark} color={C.green} soft="bg-adm-green-soft text-adm-green" href="/admin/enrollments" />
        <StatCard title="Service Bookings" value={m.cards.bookings.total} month={m.cards.bookings.month} spark={m.cards.bookings.spark} color={C.orange} soft="bg-adm-orange-soft text-[#c98100]" href="/admin/bookings" />
        <StatCard title="Organizations" value={m.cards.orgs.total} month={m.cards.orgs.month} spark={m.cards.orgs.spark} color={C.red} soft="bg-adm-red-soft text-adm-red" href="/admin/organisations" />
        <StatCard title="Total Course" value={m.cards.courses.total} month={m.cards.courses.month} spark={m.cards.courses.spark} color={C.indigo} soft="bg-adm-indigo-soft text-adm-indigo" href="/admin/courses" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        {/* activity report */}
        <section className="adm-card p-6">
          <div className="flex items-center justify-between gap-4 border-b border-adm-line pb-4">
            <h2 className="text-[22px] font-medium">Activity Report</h2>
            <RangeSwitch range={range} />
          </div>
          <div className="grid gap-5 py-6 sm:grid-cols-3">
            <MiniStat icon="users" label="New Students" value={sum(m.report.students)} tone="bg-adm-indigo-soft text-adm-indigo" />
            <MiniStat icon="book" label="Course Enquiries" value={sum(m.report.enquiries)} tone="bg-adm-green-soft text-adm-green" />
            <MiniStat icon="calendar" label="Service Bookings" value={sum(m.report.bookings)} tone="bg-adm-red-soft text-adm-red" />
          </div>
          <BarChart labels={m.report.labels} series={[
            { name: 'New students', color: C.indigo, values: m.report.students },
            { name: 'Course enquiries', color: C.green, values: m.report.enquiries },
            { name: 'Bookings', color: C.red, values: m.report.bookings },
          ]} />
        </section>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-5">
            <SideStat icon="instructor" title="Total Instructor" value={m.cards.faculty.total} spark={m.cards.faculty.spark} color={C.green} tone="bg-adm-green-soft text-adm-green" href="/admin/instructors" />
            <SideStat icon="students" title="Total Students" value={m.cards.students.total} spark={m.cards.students.spark} color={C.red} tone="bg-adm-red-soft text-adm-red" href="/admin/students" />
          </div>
          <section className="adm-card p-6">
            <div className="flex items-center justify-between border-b border-adm-line pb-4">
              <h2 className="text-[22px] font-medium">Recent Enquiries</h2>
              <Link href="/admin/enrollments" className="text-[13px] font-medium text-adm-green hover:underline">View all</Link>
            </div>
            <table className="mt-2 w-full text-[14px]">
              <thead><tr className="text-left text-adm-text"><th className="py-3 font-medium">Name</th><th className="py-3 font-medium">Course</th><th className="py-3 text-right font-medium">Status</th></tr></thead>
              <tbody>
                {m.recent.map((e) => (
                  <tr key={String(e.id)} className="border-t border-adm-line">
                    <td className="py-3"><Link href={`/admin/enrollments/${e.id}`} className="font-medium hover:text-adm-green">{String(e.name)}</Link><p className="text-[12px] text-adm-muted">{fmtDay(e.created_at)}</p></td>
                    <td className="py-3 pr-2 text-adm-muted"><span className="line-clamp-2">{course(e.course_id)}</span></td>
                    <td className="py-3 text-right"><StatusBadge value={String(e.status)} /></td>
                  </tr>
                ))}
                {!m.recent.length && <tr><td colSpan={3} className="py-8 text-center text-adm-muted">No enquiries yet.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="adm-card p-6">
          <div className="flex items-center justify-between gap-4 border-b border-adm-line pb-4">
            <h2 className="text-[22px] font-medium">Most Enquired Courses</h2>
            <RangeSwitch range={range} />
          </div>
          <table className="mt-2 w-full text-[14px]">
            <thead><tr className="text-left"><th className="py-3 font-medium">Course</th><th className="py-3 text-right font-medium">Enquiries</th><th className="py-3 text-right font-medium">Enrolled</th></tr></thead>
            <tbody>
              {m.topCourses.map((c) => (
                <tr key={c.course_id} className="border-t border-adm-line">
                  <td className="py-3"><Link href={`/admin/courses/${c.course_id}`} className="font-medium hover:text-adm-green">{course(c.course_id)}</Link></td>
                  <td className="py-3 text-right">{c.total}</td>
                  <td className="py-3 text-right text-adm-green">{c.enrolled}</td>
                </tr>
              ))}
              {!m.topCourses.length && <tr><td colSpan={3} className="py-8 text-center text-adm-muted">No enquiries in the last {range} days.</td></tr>}
            </tbody>
          </table>
        </section>
        <div className="space-y-6">
          <section className="adm-card p-6">
            <div className="flex items-center justify-between border-b border-adm-line pb-4">
              <h2 className="text-[18px] font-medium">Upcoming Live Classes</h2>
              <Link href="/admin/live-classes/new" className="adm-btn-outline adm-btn-sm"><Icon name="plus" size={16} />Schedule</Link>
            </div>
            <ul className="divide-y divide-adm-line">
              {m.upcoming.map((c) => (
                <li key={String(c.id)} className="flex items-center justify-between gap-3 py-3 text-[14px]">
                  <Link href={`/admin/live-classes/${c.id}`} className="font-medium hover:text-adm-green">{String(c.title)}</Link>
                  <span className="whitespace-nowrap text-adm-muted">{fmtDateTime(c.starts_at)}</span>
                </li>
              ))}
              {!m.upcoming.length && <li className="py-6 text-center text-[14px] text-adm-muted">Nothing scheduled.</li>}
            </ul>
          </section>
          <section className="adm-card p-6">
            <div className="flex items-center justify-between border-b border-adm-line pb-4">
              <h2 className="text-[18px] font-medium">Open Support Tickets</h2>
              <Link href="/admin/tickets" className="text-[13px] font-medium text-adm-green hover:underline">View all</Link>
            </div>
            <ul className="divide-y divide-adm-line">
              {m.tickets.map((t) => (
                <li key={String(t.id)} className="flex items-center justify-between gap-3 py-3 text-[14px]">
                  <Link href={`/admin/tickets/${t.id}`} className="font-medium hover:text-adm-green">{String(t.subject)}</Link>
                  <StatusBadge value={String(t.priority)} />
                </li>
              ))}
              {!m.tickets.length && <li className="py-6 text-center text-[14px] text-adm-muted">No open tickets 🎉</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, month, spark, color, soft, href }: { title: string; value: number; month: number; spark: number[]; color: string; soft: string; href: string }) {
  return (
    <Link href={href} className="adm-card group block p-5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgba(16,24,40,.45)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <p className="whitespace-nowrap text-[15px] font-medium text-adm-text">{title}</p>
          <p className="mt-3 text-[26px] font-medium leading-none" style={{ color }}>{value.toLocaleString('en-IN')}</p>
        </div>
        <div className="ml-auto h-[74px] w-[52%] max-w-[220px]"><Sparkline data={spark} color={color} id={title.replace(/\W/g, '')} /></div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold ${soft}`}>+{month}</span>
        <span className="text-[14px] text-adm-text">Since last Month</span>
      </div>
    </Link>
  );
}

function SideStat({ icon, title, value, spark, color, tone, href }: { icon: string; title: string; value: number; spark: number[]; color: string; tone: string; href: string }) {
  return (
    <Link href={href} className="adm-card block p-5 transition hover:-translate-y-0.5">
      <span className={`flex h-14 w-14 items-center justify-center rounded-xl ${tone}`}><Icon name={icon} size={26} /></span>
      <div className="mt-2 h-[72px]"><Sparkline data={spark} color={color} id={`s${title.replace(/\W/g, '')}`} /></div>
      <p className="mt-2 text-[15px] font-medium">{title}</p>
      <p className="mt-2 text-[24px] font-medium leading-none" style={{ color }}>{value.toLocaleString('en-IN')}</p>
    </Link>
  );
}

function MiniStat({ icon, label, value, tone }: { icon: string; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon name={icon} size={28} /></span>
      <div><p className="text-[15px] text-adm-muted">{label}</p><p className="mt-1 text-[24px] font-medium">{value.toLocaleString('en-IN')}</p></div>
    </div>
  );
}

function RangeSwitch({ range }: { range: number }) {
  return (
    <div className="flex rounded-lg border border-adm-line p-0.5 text-[13px]">
      {[7, 30].map((d) => (
        <Link key={d} href={d === 7 ? '/admin' : '/admin?range=30'} aria-current={range === d ? 'true' : undefined} className={`rounded-md px-3 py-1.5 font-medium ${range === d ? 'bg-adm-green text-white' : 'text-adm-muted hover:text-adm-text'}`}>Last {d} Days</Link>
      ))}
    </div>
  );
}
