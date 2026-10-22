import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BarChart } from '@/components/admin/charts';
import { Card, PageHeader } from '@/components/admin/ui';
import { allRecords, countRecords } from '@/lib/admin/crud';
import { RESOURCES } from '@/lib/admin/resources';
import { MIN_TERM_COUNT, siteAnalytics, type AnalyticsSummary, type Device, type Medium } from '@/lib/analytics';
import { requireRole } from '@/lib/auth';
import { todayIST } from '@/lib/format';

export const metadata: Metadata = { title: 'Website analytics' };

const DAY = 86400_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const shift = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const span = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY) + 1;
const istStart = (day: string) => new Date(`${day}T00:00:00+05:30`).toISOString();
const valid = (s?: string) => !!s && DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const n = (v: number) => v.toLocaleString('en-IN');
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

const MEDIUM: Record<Medium, string> = { direct: 'Direct / typed', search: 'Search engine', social: 'Social media', referral: 'Other website', campaign: 'Campaign link', email: 'Email' };
const DEVICE: Record<Device, string> = { mobile: 'Mobile', tablet: 'Tablet', desktop: 'Desktop' };

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

export default async function AnalyticsPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  // The admin layout checks this too; repeated here so the data is never served without it.
  await requireRole(['admin'], '/admin/analytics');
  const today = todayIST();
  let to = valid(searchParams.to) ? searchParams.to! : today;
  let from = valid(searchParams.from) ? searchParams.from! : shift(to, -29);
  if (from > to) [from, to] = [to, from];
  if (span(from, to) > 366) from = shift(to, -365);

  const [result, courses, enquiries] = await Promise.all([
    siteAnalytics(from, to),
    safe(allRecords(RESOURCES.courses), []),
    safe(countRecords('enrollments', {}, istStart(from), istStart(shift(to, 1))), 0),
  ]);
  const title = new Map(courses.map((c) => [String(c.slug), String(c.title)]));
  const preset = (d: number) => `/admin/analytics?from=${shift(today, -(d - 1))}&to=${today}`;

  return (
    <>
      <PageHeader title="Website analytics" crumbs={[{ label: 'Reports' }, { label: 'Website analytics' }]}
        sub="Counts only visitors who accepted analytics cookies. No names, emails, phone numbers or account IDs are stored, and no one visitor’s activity is shown." />
      <form method="get" className="adm-card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div><label htmlFor="from" className="adm-label">From</label><input id="from" type="date" name="from" defaultValue={from} max={today} className="adm-input" /></div>
        <div><label htmlFor="to" className="adm-label">To</label><input id="to" type="date" name="to" defaultValue={to} max={today} className="adm-input" /></div>
        <button className="adm-btn-primary">Show</button>
        <div className="flex flex-wrap gap-1 sm:ml-auto">
          {[7, 30, 90].map((d) => <Link key={d} href={preset(d)} className="adm-btn-ghost adm-btn-sm">Last {d} days</Link>)}
        </div>
      </form>

      {result.ok ? <Dashboard data={result.data} from={from} to={to} enquiries={enquiries} title={title} /> : (
        <Card title={result.missing ? 'Analytics isn’t set up in the database yet' : 'Couldn’t load analytics'}>
          {result.missing ? (
            <p className="text-[14px] text-adm-muted">
              Run <code className="rounded bg-adm-bg px-1.5 py-0.5">supabase/migrations/20261022130000_site_analytics.sql</code> in the Supabase SQL editor.
              Until then the cookie banner works as normal and nothing is recorded.
            </p>
          ) : <p className="text-[14px] text-adm-muted">{result.message}</p>}
        </Card>
      )}
    </>
  );
}

function Dashboard({ data, from, to, enquiries, title }: { data: AnalyticsSummary; from: string; to: string; enquiries: number; title: Map<string, string> }) {
  const t = data.totals;
  const days = Array.from({ length: span(from, to) }, (_, i) => shift(from, i));
  const byDay = new Map(data.daily.map((d) => [d.day, d]));
  const labels = days.map((d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }));
  const deviceTotal = data.devices.reduce((a, d) => a + d.visitors, 0);
  const visitsTotal = data.sources.reduce((a, s) => a + s.visits, 0);
  const empty = <p className="text-[14px] text-adm-muted">Nothing in this period.</p>;

  return (
    <div data-testid="analytics-dashboard">
      <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Tile label="Page views" value={n(t.views)} />
        <Tile label="Unique visitors" value={n(t.visitors)} />
        <Tile label="Returning visitors" value={n(t.returning)} note={`${pct(t.returning, t.visitors)} of visitors`} />
        <Tile label="Visits" value={n(t.visits)} note="Arrivals from outside the site" />
        <Tile label="Course views" value={n(t.courseViews)} />
        <Tile label="Course searches" value={n(t.searches)} />
      </div>

      <Card title="Per day" className="mb-6">
        <BarChart labels={labels} height={240} series={[
          { name: 'Page views', color: '#27AE7A', values: days.map((d) => byDay.get(d)?.views ?? 0) },
          { name: 'Visitors', color: '#3B82F6', values: days.map((d) => byDay.get(d)?.visitors ?? 0) },
        ]} />
      </Card>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card title="Popular pages" pad={false}>
          <Table head={['Page', 'Views', 'Visitors']} rows={data.pages.map((p) => [<span key="p" className="break-all font-mono text-[13px]">{p.path}</span>, n(p.views), n(p.visitors)])} />
        </Card>
        <Card title="Popular courses" pad={false}>
          <Table head={['Course', 'Views', 'Opened form', 'Sent']}
            rows={data.courses.map((c) => [title.get(c.slug) ?? c.slug, n(c.views), n(c.starts), n(c.sent)])} />
        </Card>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card title="Enrollment funnel">
          <ol className="space-y-4">
            <Step label="Viewed a course" value={data.funnel.viewed} of={data.funnel.viewed} />
            <Step label="Opened the enrolment form" value={data.funnel.started} of={data.funnel.viewed} />
            <Step label="Sent an enquiry" value={data.funnel.sent} of={data.funnel.viewed} />
          </ol>
          <p className="mt-5 border-t border-adm-line pt-4 text-[13px] text-adm-muted">
            Visitors in this funnel only include those who allowed analytics. All enquiries received in this period (from every visitor): <strong className="text-adm-text">{n(enquiries)}</strong>
          </p>
        </Card>
        <Card title="Traffic sources">
          {data.sources.length ? (
            <ul className="space-y-3">
              {data.sources.map((s) => <Share key={`${s.source}|${s.medium}`} label={s.source === 'direct' ? 'Direct / typed' : s.source} sub={s.source === 'direct' ? undefined : MEDIUM[s.medium]} value={s.visits} total={visitsTotal} />)}
            </ul>
          ) : empty}
        </Card>
        <Card title="Devices">
          {data.devices.length ? (
            <ul className="space-y-3">
              {data.devices.map((d) => <Share key={d.device} label={DEVICE[d.device]} value={d.visitors} total={deviceTotal} sub="visitors" />)}
            </ul>
          ) : empty}
        </Card>
      </div>

      <Card title="Course searches" pad={false}>
        <Table head={['Search words', 'Searches', 'No results']} rows={data.searches.map((s) => [s.term, n(s.count), s.zero ? <span key="z" className="font-medium text-[#B42318]">{n(s.zero)}</span> : '0'])} />
        <p className="border-t border-adm-line px-5 py-3 text-[12px] text-adm-muted">
          Words appear once at least {MIN_TERM_COUNT} searches used them. Searches that look like a phone number or email are counted but never shown.
        </p>
      </Card>
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="adm-card p-5">
      <p className="text-[14px] text-adm-muted">{label}</p>
      <p className="mt-2 text-[26px] font-medium text-adm-text">{value}</p>
      {note && <p className="mt-1 text-[12px] text-adm-muted">{note}</p>}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="adm-scroll overflow-x-auto">
      <table className="w-full">
        <thead className="bg-[#F8FBFA]"><tr>{head.map((h, i) => <th key={h} className={`adm-th ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => <tr key={i} className="border-t border-adm-line">{r.map((c, j) => <td key={j} className={`adm-td ${j ? 'text-right' : ''}`}>{c}</td>)}</tr>)}
          {!rows.length && <tr><td className="adm-td text-center text-adm-muted" colSpan={head.length}>Nothing in this period.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Share({ label, sub, value, total }: { label: string; sub?: string; value: number; total: number }) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-[14px]">
        <span className="min-w-0 truncate">{label}{sub && <span className="ml-2 text-[12px] text-adm-muted">{sub}</span>}</span>
        <span className="shrink-0">{n(value)} <span className="text-[12px] text-adm-muted">({pct(value, total)})</span></span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-adm-bg"><div className="h-full rounded-full bg-adm-green" style={{ width: `${total ? (value / total) * 100 : 0}%` }} /></div>
    </li>
  );
}

function Step({ label, value, of }: { label: string; value: number; of: number }) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-[14px]"><span>{label}</span><span className="font-medium">{n(value)} <span className="text-[12px] font-normal text-adm-muted">{pct(value, of)}</span></span></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-adm-bg"><div className="h-full rounded-full bg-adm-green" style={{ width: `${of ? (value / of) * 100 : 0}%` }} /></div>
    </li>
  );
}
