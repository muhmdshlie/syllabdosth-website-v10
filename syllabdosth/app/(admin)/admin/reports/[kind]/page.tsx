import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BarChart } from '@/components/admin/charts';
import { Icon } from '@/components/admin/icons';
import { Card, PageHeader, StatusBadge } from '@/components/admin/ui';
import { allRecords, relationOptions } from '@/lib/admin/crud';
import { RESOURCES } from '@/lib/admin/resources';
import type { Row } from '@/lib/admin/types';
import { inr } from '@/lib/format';

const KINDS = {
  enrolments: { title: 'Enrolment Report', resource: 'enrollments', statusField: 'status', groupBy: 'course_id', groupLabel: 'Course', to: 'courses' },
  bookings: { title: 'Booking Report', resource: 'bookings', statusField: 'status', groupBy: 'service_id', groupLabel: 'Service', to: 'services' },
  courses: { title: 'Course Report', resource: 'enrollments', statusField: 'status', groupBy: 'course_id', groupLabel: 'Course', to: 'courses' },
  students: { title: 'Student Report', resource: 'students', statusField: 'status', groupBy: 'city', groupLabel: 'City', to: '' },
} as const;
type Kind = keyof typeof KINDS;

export function generateMetadata({ params }: { params: { kind: string } }): Metadata {
  return { title: KINDS[params.kind as Kind]?.title ?? 'Reports' };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function Report({ params, searchParams }: { params: { kind: string }; searchParams: { from?: string; to?: string } }) {
  const k = KINDS[params.kind as Kind];
  if (!k) notFound();
  const today = new Date(Date.now() + 330 * 60_000);
  const to = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.to ?? '') ? searchParams.to! : iso(today);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.from ?? '') ? searchParams.from! : iso(new Date(today.getTime() - 29 * 86400_000));
  const r = RESOURCES[k.resource];
  const fromIso = new Date(`${from}T00:00:00+05:30`).toISOString();
  const rows = await allRecords(r, { from: fromIso, to });
  const opts = k.to ? (await relationOptions([k.to, 'courses']))[k.to] ?? [] : [];
  const courses = params.kind === 'courses' ? await allRecords(RESOURCES.courses) : [];

  // per day
  const start = new Date(`${from}T00:00:00+05:30`).getTime();
  const days = Math.min(120, Math.max(1, Math.round((new Date(`${to}T00:00:00+05:30`).getTime() - start) / 86400_000) + 1));
  const perDay = Array(days).fill(0) as number[];
  for (const row of rows) { const i = Math.floor((new Date(String(row.created_at)).getTime() - start) / 86400_000); if (i >= 0 && i < days) perDay[i]++; }
  const labels = Array.from({ length: days }, (_, i) => new Date(start + i * 86400_000 + 330 * 60_000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }));

  const byStatus = count(rows, k.statusField);
  const byGroup = count(rows, k.groupBy);
  const label = (v: string) => (k.to ? opts.find((o) => o.value === v)?.label ?? v : v || 'Not set');
  const exportHref = `/admin/export/${k.resource}?from=${from}&to=${to}`;

  return (
    <>
      <PageHeader title={k.title} crumbs={[{ label: 'Reports' }, { label: k.title }]}
        actions={<a href={exportHref} className="adm-btn-outline"><Icon name="download" size={18} />Export CSV</a>} />
      <form method="get" className="adm-card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div><label htmlFor="from" className="adm-label">From</label><input id="from" type="date" name="from" defaultValue={from} className="adm-input" /></div>
        <div><label htmlFor="to" className="adm-label">To</label><input id="to" type="date" name="to" defaultValue={to} className="adm-input" /></div>
        <button className="adm-btn-primary">Show</button>
        <div className="ml-auto flex flex-wrap gap-1">
          {[7, 30, 90].map((d) => <Link key={d} href={`/admin/reports/${params.kind}?from=${iso(new Date(today.getTime() - (d - 1) * 86400_000))}&to=${iso(today)}`} className="adm-btn-ghost adm-btn-sm">Last {d} days</Link>)}
        </div>
      </form>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label={params.kind === 'students' ? 'New students' : params.kind === 'bookings' ? 'Bookings' : 'Enquiries'} value={rows.length} />
        {params.kind === 'students' ? <Tile label="Blocked" value={byStatus.get('blocked') ?? 0} /> : <Tile label={params.kind === 'bookings' ? 'Confirmed or completed' : 'Enrolled'} value={(byStatus.get('converted') ?? 0) + (byStatus.get('confirmed') ?? 0) + (byStatus.get('completed') ?? 0)} />}
        {params.kind === 'bookings' ? <Tile label="Value (starting prices)" value={inr(rows.reduce((a, b) => a + (Number(b.price_from) || 0), 0))} /> : <Tile label="Busiest day" value={Math.max(0, ...perDay)} />}
        <Tile label="Days" value={days} />
      </div>

      <Card title="Per day" className="mb-6"><BarChart labels={labels} series={[{ name: k.title.replace(' Report', ''), color: '#27AE7A', values: perDay }]} height={240} /></Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title={params.kind === 'courses' ? 'Courses: enquiries and conversion' : `By ${k.groupLabel.toLowerCase()}`} pad={false}>
          <table className="w-full">
            <thead className="bg-[#F8FBFA]"><tr><th className="adm-th">{k.groupLabel}</th><th className="adm-th text-right">Count</th>{params.kind === 'courses' && <><th className="adm-th text-right">Enrolled</th><th className="adm-th text-right">Conversion</th></>}</tr></thead>
            <tbody>
              {(params.kind === 'courses' ? courses.map((c) => [String(c.id), byGroup.get(String(c.id)) ?? 0] as [string, number]).sort((a, b) => b[1] - a[1]) : Array.from(byGroup.entries()).sort((a, b) => b[1] - a[1])).map(([g, n]) => {
                const enrolled = rows.filter((x) => String(x[k.groupBy]) === g && x.status === 'converted').length;
                return (
                  <tr key={g} className="border-t border-adm-line">
                    <td className="adm-td">{label(g)}</td>
                    <td className="adm-td text-right">{n}</td>
                    {params.kind === 'courses' && <><td className="adm-td text-right">{enrolled}</td><td className="adm-td text-right">{n ? `${Math.round((enrolled / n) * 100)}%` : '—'}</td></>}
                  </tr>
                );
              })}
              {!rows.length && params.kind !== 'courses' && <tr><td className="adm-td text-center text-adm-muted" colSpan={2}>Nothing in this period.</td></tr>}
            </tbody>
          </table>
        </Card>
        <Card title="By status">
          <ul className="space-y-3">
            {Array.from(byStatus.entries()).map(([st, n]) => (
              <li key={st} className="flex items-center gap-3">
                <StatusBadge value={st || 'none'} />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-adm-bg"><div className="h-full rounded-full bg-adm-green" style={{ width: `${(n / Math.max(1, rows.length)) * 100}%` }} /></div>
                <span className="w-10 text-right text-[14px]">{n}</span>
              </li>
            ))}
            {!rows.length && <li className="text-[14px] text-adm-muted">Nothing in this period.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}

function count(rows: Row[], field: string) {
  const m = new Map<string, number>();
  for (const r of rows) { const k = String(r[field] ?? ''); m.set(k, (m.get(k) ?? 0) + 1); }
  return m;
}

function Tile({ label, value }: { label: string; value: number | string }) {
  return <div className="adm-card p-5"><p className="text-[14px] text-adm-muted">{label}</p><p className="mt-2 text-[26px] font-medium text-adm-text">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</p></div>;
}
