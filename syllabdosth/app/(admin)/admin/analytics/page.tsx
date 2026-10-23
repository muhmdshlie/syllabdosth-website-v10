import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BarChart } from '@/components/admin/charts';
import { Card, PageHeader } from '@/components/admin/ui';
import { allRecords, countRecords } from '@/lib/admin/crud';
import { RESOURCES } from '@/lib/admin/resources';
import { MIN_TERM_COUNT, VITALS, siteAnalytics, type AnalyticsSummary, type Browser, type Device, type Medium } from '@/lib/analytics';
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
const dateLabel = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { ...o, timeZone: 'UTC' });

const MEDIUM: Record<Medium, string> = { direct: 'Direct / typed', search: 'Search engine', social: 'Social media', referral: 'Other website', campaign: 'Campaign link', email: 'Email' };
const DEVICE: Record<Device, string> = { mobile: 'Mobile', tablet: 'Tablet', desktop: 'Desktop' };
const BROWSER: Record<Browser, string> = { chrome: 'Chrome', safari: 'Safari', edge: 'Edge', firefox: 'Firefox', samsung: 'Samsung Internet', opera: 'Opera', in_app: 'In-app (Instagram, Facebook…)', other: 'Other' };
const GRAINS = { day: 'Daily', week: 'Weekly', month: 'Monthly' } as const;
type Grain = keyof typeof GRAINS;

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

/** Real records created in the period (every visitor, not only those who allowed analytics). Null when a count fails. */
async function business(from: string, to: string) {
  const since = istStart(from);
  const until = istStart(shift(to, 1));
  const c = (t: string, f: Record<string, string> = {}) => safe<number | null>(countRecords(t, f, since, until), null);
  const [enquiries, enrolled, bookings, confirmed, completed, cancelled, declined, groups, applications, franchise, messages, learners, newsletter] = await Promise.all([
    c('enrollments'), c('enrollments', { status: 'converted' }),
    c('bookings'), c('bookings', { status: 'confirmed' }), c('bookings', { status: 'completed' }), c('bookings', { status: 'cancelled' }), c('bookings', { status: 'declined' }),
    c('group_enquiries'), c('applications'), c('franchise_enquiries'), c('contact_messages'), c('profiles', { role: 'learner' }), c('newsletter_subscribers'),
  ]);
  const add = (...v: (number | null)[]) => (v.some((x) => x === null) ? null : v.reduce<number>((a, x) => a + (x ?? 0), 0));
  return { enquiries, enrolled, bookings, booked: add(confirmed, completed), lost: add(cancelled, declined), groups, applications, franchise, messages, learners, newsletter };
}
type Business = Awaited<ReturnType<typeof business>>;

export default async function AnalyticsPage({ searchParams }: { searchParams: { from?: string; to?: string; g?: string } }) {
  // The admin layout checks this too; repeated here so the data is never served without it.
  await requireRole(['admin'], '/admin/analytics');
  const today = todayIST();
  let to = valid(searchParams.to) ? searchParams.to! : today;
  let from = valid(searchParams.from) ? searchParams.from! : shift(to, -29);
  if (from > to) [from, to] = [to, from];
  if (span(from, to) > 366) from = shift(to, -365);
  const grain: Grain = searchParams.g === 'week' || searchParams.g === 'month' ? searchParams.g : 'day';
  // The same number of days just before, for the comparison under each figure.
  const prevTo = shift(from, -1);
  const prevFrom = shift(prevTo, -(span(from, to) - 1));

  const [result, prev, courses, biz, prevBiz] = await Promise.all([
    siteAnalytics(from, to),
    siteAnalytics(prevFrom, prevTo),
    safe(allRecords(RESOURCES.courses), []),
    business(from, to),
    business(prevFrom, prevTo),
  ]);
  const title = new Map(courses.map((c) => [String(c.slug), String(c.title)]));
  const preset = (d: number) => `/admin/analytics?from=${shift(today, -(d - 1))}&to=${today}&g=${grain}`;

  return (
    <>
      <PageHeader title="Website analytics" crumbs={[{ label: 'Reports' }, { label: 'Website analytics' }]}
        sub="Website figures count only visitors who accepted analytics cookies. Business results count every record in your database. No names, emails, phone numbers or account IDs are used, and no one visitor’s activity is shown." />
      <form method="get" className="adm-card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div><label htmlFor="from" className="adm-label">From</label><input id="from" type="date" name="from" defaultValue={from} max={today} className="adm-input" /></div>
        <div><label htmlFor="to" className="adm-label">To</label><input id="to" type="date" name="to" defaultValue={to} max={today} className="adm-input" /></div>
        <div>
          <label htmlFor="g" className="adm-label">Trend</label>
          <select id="g" name="g" defaultValue={grain} className="adm-input">
            {Object.entries(GRAINS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button className="adm-btn-primary">Show</button>
        <div className="flex flex-wrap gap-1 sm:ml-auto">
          {[7, 30, 90].map((d) => <Link key={d} href={preset(d)} className="adm-btn-ghost adm-btn-sm">Last {d} days</Link>)}
        </div>
      </form>

      <BusinessResults biz={biz} prev={prevBiz} />

      {result.ok ? (
        <>
          {!result.v2 && (
            <Card title="Visits, campaigns and page speed need a database update" className="mb-6">
              <p className="text-[14px] text-adm-muted">
                Run <code className="rounded bg-adm-bg px-1.5 py-0.5">supabase/migrations/20261023120000_analytics_v2.sql</code> in the Supabase SQL editor.
                Until then page views, sources and course figures work as before, and the new sections stay empty.
              </p>
            </Card>
          )}
          <Dashboard data={result.data} prev={prev.ok ? prev.data : null} from={from} to={to} grain={grain} title={title} />
        </>
      ) : (
        <Card title={result.missing ? 'Analytics isn’t set up in the database yet' : 'Couldn’t load analytics'}>
          {result.missing ? (
            <p className="text-[14px] text-adm-muted">
              Run <code className="rounded bg-adm-bg px-1.5 py-0.5">supabase/migrations/20261022130000_site_analytics.sql</code> in the Supabase SQL editor.
              Until then the cookie banner works as normal and nothing is recorded.
            </p>
          ) : <p className="text-[14px] text-adm-muted">{result.message}</p>}
        </Card>
      )}

      <Card title="Google Analytics" className="mt-6">
        <p className="text-[14px] text-adm-muted">
          Engagement time and Google’s own reports are in <a href="https://analytics.google.com/" target="_blank" rel="noreferrer" className="font-medium text-adm-text underline">Google Analytics</a> (when it is switched on in Add-ons).
          Its numbers are estimates, also count only visitors who accepted analytics cookies, and won’t match the figures on this page exactly.
        </p>
      </Card>
    </>
  );
}

function BusinessResults({ biz, prev }: { biz: Business; prev: Business }) {
  const v = (x: number | null) => (x === null ? '—' : n(x));
  return (
    <section className="mb-6" data-testid="business-results">
      <h2 className="mb-1 text-[17px] font-semibold">Business results</h2>
      <p className="mb-4 text-[13px] text-adm-muted">From your records: every enquiry, booking and sign-up made in this period, whether or not the visitor allowed analytics.</p>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Course enquiries" value={v(biz.enquiries)} note={<Change now={biz.enquiries} before={prev.enquiries} />} />
        <Tile label="Enquiries now enrolled" value={v(biz.enrolled)} note={biz.enquiries ? `${pct(biz.enrolled ?? 0, biz.enquiries)} of this period’s enquiries` : undefined} />
        <Tile label="Booking requests" value={v(biz.bookings)} note={<Change now={biz.bookings} before={prev.bookings} />} />
        <Tile label="Bookings confirmed or completed" value={v(biz.booked)} note={biz.lost ? `${n(biz.lost)} cancelled or declined` : undefined} />
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-3 xl:grid-cols-6">
        <Tile small label="Group enquiries" value={v(biz.groups)} />
        <Tile small label="Teach / pro applications" value={v(biz.applications)} />
        <Tile small label="Franchise enquiries" value={v(biz.franchise)} />
        <Tile small label="Contact messages" value={v(biz.messages)} />
        <Tile small label="New learner accounts" value={v(biz.learners)} />
        <Tile small label="Newsletter sign-ups" value={v(biz.newsletter)} />
      </div>
      <p className="mt-3 text-[12px] text-adm-muted">
        “Enrolled” and “confirmed” show the current status of requests made in this period. Online payments aren’t switched on, so there is no payment or revenue data.
        Details: <Link href="/admin/reports/enrolments" className="underline">Enrolment report</Link> · <Link href="/admin/reports/bookings" className="underline">Booking report</Link>
      </p>
    </section>
  );
}

function Dashboard({ data, prev, from, to, grain, title }: { data: AnalyticsSummary; prev: AnalyticsSummary | null; from: string; to: string; grain: Grain; title: Map<string, string> }) {
  const t = data.totals;
  const p = prev?.totals;
  const deviceTotal = data.devices.reduce((a, d) => a + d.visitors, 0);
  const browserTotal = data.browsers.reduce((a, b) => a + b.visitors, 0);
  const visitsTotal = data.sources.reduce((a, s) => a + s.visits, 0);
  const empty = <p className="text-[14px] text-adm-muted">Nothing in this period.</p>;

  return (
    <div data-testid="analytics-dashboard">
      <h2 className="mb-1 text-[17px] font-semibold">Website</h2>
      <p className="mb-4 text-[13px] text-adm-muted">Visitors who accepted analytics cookies. A visit ends after 30 minutes without a page view, or when the visitor comes back from another site or a campaign link.</p>
      <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Tile label="Page views" value={n(t.views)} note={<Change now={t.views} before={p?.views} />} />
        <Tile label="Unique visitors" value={n(t.visitors)} note={<Change now={t.visitors} before={p?.visitors} />} />
        <Tile label="Visits" value={n(t.sessions)} note={<Change now={t.sessions} before={p?.sessions} />} />
        <Tile label="New / returning" value={`${n(t.visitors - t.returning)} / ${n(t.returning)}`} note={`${pct(t.returning, t.visitors)} returning`} />
        <Tile label="One-page visits" value={pct(t.singlePage, t.sessions)} note={`${n(t.singlePage)} of ${n(t.sessions)} visits`} />
        <Tile label="Visits reaching a confirmation page" value={n(t.converted)} note={`${pct(t.converted, t.sessions)} of visits · enquiry, booking, group or application`} />
      </div>

      <Card title={`${GRAINS[grain]} trend`} className="mb-6">
        <Trend data={data} from={from} to={to} grain={grain} />
      </Card>

      <h2 className="mb-4 text-[17px] font-semibold">Conversion funnels</h2>
      <div className="mb-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Course enrolment">
          <ol className="space-y-4">
            <Step label="Viewed a course" value={data.funnel.viewed} of={data.funnel.viewed} />
            <Step label="Opened the enrolment form" value={data.funnel.started} of={data.funnel.viewed} />
            <Step label="Reached “enquiry sent”" value={data.funnel.sent} of={data.funnel.viewed} />
          </ol>
        </Card>
        <Card title="Service booking">
          <ol className="space-y-4">
            <Step label="Viewed a service" value={data.funnels.serviceViewed} of={data.funnels.serviceViewed} />
            <Step label="Reached “request sent”" value={data.funnels.bookingSent} of={data.funnels.serviceViewed} />
          </ol>
        </Card>
        <Card title="Group booking">
          <ol className="space-y-4">
            <Step label="Opened the group form" value={data.funnels.groupOpened} of={data.funnels.groupOpened} />
            <Step label="Reached “enquiry sent”" value={data.funnels.groupSent} of={data.funnels.groupOpened} />
          </ol>
        </Card>
        <Card title="Applications">
          <ol className="space-y-4">
            <Step label="Opened an application" value={data.funnels.applyOpened} of={data.funnels.applyOpened} />
            <Step label="Reached “application sent”" value={data.funnels.applySent} of={data.funnels.applyOpened} />
          </ol>
        </Card>
      </div>
      <p className="-mt-3 mb-6 text-[12px] text-adm-muted">Funnels count visitors who allowed analytics and who reached each page; the last step is the confirmation page shown after a form is saved. They are estimates and lower than reality. Real enquiries, bookings and enrolments are the business results above, counted from your records.</p>

      <h2 className="mb-4 text-[17px] font-semibold">Where visitors come from</h2>
      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card title="Traffic sources">
          {data.sources.length ? (
            <ul className="space-y-3">
              {data.sources.map((s) => <Share key={`${s.source}|${s.medium}`} label={s.source === 'direct' ? 'Direct / typed' : s.source} sub={s.source === 'direct' ? undefined : MEDIUM[s.medium]} value={s.visits} total={visitsTotal} extra={s.converted ? `${n(s.converted)} reached a confirmation page` : undefined} />)}
            </ul>
          ) : empty}
        </Card>
        <Card title="Campaigns (utm_campaign)" pad={false}>
          <Table head={['Campaign', 'Visits', 'Confirmation page']} rows={data.campaigns.map((c) => [
            <span key="c"><span className="font-medium">{c.campaign}</span><span className="ml-2 text-[12px] text-adm-muted">{c.source}</span></span>, n(c.visits), `${n(c.converted)} (${pct(c.converted, c.visits)})`,
          ])} />
        </Card>
        <Card title="Entry pages" pad={false}>
          <Table head={['First page of a visit', 'Visits', 'One-page']} rows={data.entries.map((e) => [<Path key="p" path={e.path} />, n(e.visits), pct(e.singlePage, e.visits)])} />
        </Card>
      </div>

      <h2 className="mb-4 text-[17px] font-semibold">Pages and courses</h2>
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card title="Popular pages" pad={false}>
          <Table head={['Page', 'Views', 'Visitors']} rows={data.pages.map((x) => [<Path key="p" path={x.path} />, n(x.views), n(x.visitors)])} />
        </Card>
        <Card title="Popular courses" pad={false}>
          <Table head={['Course', 'Views', 'Opened form', 'Confirmation page']}
            rows={data.courses.map((c) => [title.get(c.slug) ?? c.slug, n(c.views), n(c.starts), n(c.sent)])} />
        </Card>
        <Card title="Popular services" pad={false}>
          <Table head={['Service page', 'Views', 'Visitors']} rows={data.services.map((x) => [<Path key="p" path={x.path} />, n(x.views), n(x.visitors)])} />
        </Card>
        <Card title="Course searches" pad={false}>
          <Table head={['Search words', 'Searches', 'No results']} rows={data.searches.map((s) => [s.term, n(s.count), s.zero ? <span key="z" className="font-medium text-[#B42318]">{n(s.zero)}</span> : '0'])} />
          <p className="border-t border-adm-line px-5 py-3 text-[12px] text-adm-muted">
            Words appear once at least {MIN_TERM_COUNT} searches used them. Searches that look like a phone number or email are counted but never shown.
          </p>
        </Card>
      </div>

      <h2 className="mb-4 text-[17px] font-semibold">Devices and site health</h2>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Devices and browsers">
          {data.devices.length ? (
            <ul className="space-y-3">
              {data.devices.map((d) => <Share key={d.device} label={DEVICE[d.device]} value={d.visitors} total={deviceTotal} sub="visitors" />)}
            </ul>
          ) : empty}
          {data.browsers.length > 0 && (
            <ul className="mt-5 space-y-3 border-t border-adm-line pt-5">
              {data.browsers.map((b) => <Share key={b.browser} label={BROWSER[b.browser] ?? b.browser} value={b.visitors} total={browserTotal} sub="visitors" />)}
            </ul>
          )}
        </Card>
        <Card title="Page speed (Core Web Vitals)" pad={false}>
          <Table head={['Measure', '75% of loads under', 'Good']} rows={data.vitals.map((v) => {
            const lim = VITALS[v.metric];
            const tone = v.p75 <= lim.good ? 'text-adm-green' : v.p75 > lim.poor ? 'text-[#B42318]' : 'text-[#B54708]';
            return [<span key="l">{lim.label} <span className="text-[12px] text-adm-muted">{v.metric}</span></span>, <span key="v" className={`font-medium ${tone}`}>{v.metric === 'CLS' ? v.p75.toFixed(2) : `${(v.p75 / 1000).toFixed(1)} s`}</span>, `${pct(v.good, v.samples)} of ${n(v.samples)}`];
          })} />
          <p className="border-t border-adm-line px-5 py-3 text-[12px] text-adm-muted">Measured in visitors’ browsers on the first page they load. Green is within Google’s “good” limit, red is “poor”.</p>
        </Card>
        <Card title="Slowest pages and errors" pad={false}>
          <Table head={['Page', 'Main content loaded']} rows={data.slowPages.map((x) => [<Path key="p" path={x.path} />, `${(x.p75 / 1000).toFixed(1)} s`])} />
          <Table head={['Page with an error', 'Errors']} rows={data.errors.map((x) => [<Path key="p" path={x.path} />, n(x.count)])} />
        </Card>
      </div>
    </div>
  );
}

function Trend({ data, from, to, grain }: { data: AnalyticsSummary; from: string; to: string; grain: Grain }) {
  if (grain === 'day') {
    const days = Array.from({ length: span(from, to) }, (_, i) => shift(from, i));
    const byDay = new Map(data.daily.map((d) => [d.day, d]));
    return (
      <BarChart labels={days.map((d) => dateLabel(d, { day: 'numeric', month: 'short' }))} height={240} series={[
        { name: 'Page views', color: '#27AE7A', values: days.map((d) => byDay.get(d)?.views ?? 0) },
        { name: 'Visitors', color: '#3B82F6', values: days.map((d) => byDay.get(d)?.visitors ?? 0) },
        { name: 'Visits', color: '#F4A51C', values: days.map((d) => byDay.get(d)?.sessions ?? 0) },
      ]} />
    );
  }
  const list = grain === 'week' ? data.weekly : data.monthly;
  if (!list.length) return <p className="text-[14px] text-adm-muted">Nothing in this period.</p>;
  return (
    <>
      <BarChart height={240} labels={list.map((x) => (grain === 'week' ? `w/c ${dateLabel(x.start, { day: 'numeric', month: 'short' })}` : dateLabel(x.start, { month: 'short', year: 'numeric' })))} series={[
        { name: 'Page views', color: '#27AE7A', values: list.map((x) => x.views) },
        { name: 'Visitors', color: '#3B82F6', values: list.map((x) => x.visitors) },
      ]} />
      <p className="mt-2 text-[12px] text-adm-muted">The first and last {grain === 'week' ? 'weeks' : 'months'} may be partial: only days inside the chosen dates are counted.</p>
    </>
  );
}

function Change({ now, before }: { now: number | null; before?: number | null }) {
  if (now === null || before === null || before === undefined) return null;
  if (!before) return <>{now ? 'None in the previous period' : 'Same as the previous period'}</>;
  const d = Math.round(((now - before) / before) * 100);
  if (!d) return <>Same as the previous period</>;
  return <span className={d > 0 ? 'text-adm-green' : 'text-[#B42318]'}>{d > 0 ? '▲' : '▼'} {Math.abs(d)}% <span className="text-adm-muted">vs previous period</span></span>;
}

function Path({ path }: { path: string }) {
  return <span className="break-all font-mono text-[13px]">{path}</span>;
}

function Tile({ label, value, note, small }: { label: string; value: string; note?: ReactNode; small?: boolean }) {
  return (
    <div className={`adm-card ${small ? 'p-4' : 'p-5'}`}>
      <p className={`${small ? 'text-[13px]' : 'text-[14px]'} text-adm-muted`}>{label}</p>
      <p className={`mt-2 ${small ? 'text-[20px]' : 'text-[26px]'} font-medium text-adm-text`}>{value}</p>
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

function Share({ label, sub, value, total, extra }: { label: string; sub?: string; value: number; total: number; extra?: string }) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-[14px]">
        <span className="min-w-0 truncate">{label}{sub && <span className="ml-2 text-[12px] text-adm-muted">{sub}</span>}</span>
        <span className="shrink-0">{n(value)} <span className="text-[12px] text-adm-muted">({pct(value, total)})</span></span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-adm-bg"><div className="h-full rounded-full bg-adm-green" style={{ width: `${total ? (value / total) * 100 : 0}%` }} /></div>
      {extra && <p className="mt-1 text-[12px] text-adm-muted">{extra}</p>}
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
