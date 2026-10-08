/** Server-safe building blocks for admin pages. */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from './icons';

export function PageHeader({ title, crumbs, sub, actions }: { title: string; crumbs?: { href?: string; label: string }[]; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[13px] text-adm-muted">
            <Link href="/admin" className="hover:text-adm-green">Dashboard</Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <Icon name="chevronRight" size={14} />
                {c.href ? <Link href={c.href} className="hover:text-adm-green">{c.label}</Link> : <span className="text-adm-text">{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-[24px] font-semibold text-adm-text">{title}</h1>
        {sub && <p className="mt-1 max-w-3xl text-[14px] text-adm-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, action, children, className = '', pad = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`adm-card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 border-b border-adm-line px-5 py-4">
          {typeof title === 'string' ? <h2 className="text-[17px] font-semibold">{title}</h2> : title}
          {action}
        </div>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

const TONES: Record<string, string> = {
  green: 'bg-adm-green-soft text-[#16784f]', orange: 'bg-adm-orange-soft text-[#9a5b00]', red: 'bg-adm-red-soft text-[#b3321a]',
  blue: 'bg-adm-blue-soft text-[#1b5fbf]', indigo: 'bg-adm-indigo-soft text-[#3942a8]', grey: 'bg-[#EEF1F4] text-adm-muted',
};
const STATUS_TONE: Record<string, keyof typeof TONES> = {
  new: 'orange', pending: 'orange', open: 'orange', submitted: 'orange', scheduled: 'blue', reviewing: 'blue', contacted: 'blue', in_progress: 'blue', live: 'red',
  converted: 'green', approved: 'green', confirmed: 'green', completed: 'green', active: 'green', graded: 'green', resolved: 'green', replied: 'green',
  closed: 'grey', cancelled: 'grey', declined: 'grey', rejected: 'red', blocked: 'red', inactive: 'grey', returned: 'orange',
  urgent: 'red', high: 'orange', normal: 'blue', low: 'grey',
  create: 'green', update: 'blue', delete: 'red', settings: 'indigo', upload: 'indigo', cache: 'grey',
  learner: 'blue', faculty: 'indigo', professional: 'orange', admin: 'green',
  quiz: 'indigo', assignment: 'blue', all: 'green', user: 'orange',
  franchise: 'indigo', training_partner: 'blue', corporate: 'orange', college: 'green', other: 'grey',
  video: 'indigo', reading: 'blue', download: 'grey',
};
const LABELS: Record<string, string> = { converted: 'Enrolled', in_progress: 'In progress', training_partner: 'Training partner', learner: 'Student', submitted: 'To grade', all: 'Everyone', user: 'One person', create: 'Added', update: 'Edited', delete: 'Deleted' };

export function StatusBadge({ value, tone }: { value: string; tone?: keyof typeof TONES }) {
  const t = tone ?? STATUS_TONE[value] ?? 'grey';
  const label = LABELS[value] ?? value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return <span className={`adm-badge ${TONES[t]}`}>{label}</span>;
}

export function Flash({ tone = 'green', children }: { tone?: 'green' | 'red' | 'orange'; children: ReactNode }) {
  const t = { green: 'border-adm-green/30 bg-adm-green-soft text-[#16784f]', red: 'border-adm-red/30 bg-adm-red-soft text-[#b3321a]', orange: 'border-adm-orange/40 bg-adm-orange-soft text-[#8a5200]' }[tone];
  return <div role={tone === 'red' ? 'alert' : 'status'} className={`mb-5 rounded-xl border px-4 py-3 text-[14px] font-medium ${t}`}>{children}</div>;
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-adm-bg text-adm-muted"><Icon name="search" /></div>
      <p className="text-[16px] font-semibold">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-md text-[14px] text-adm-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums = Array.from(new Set([1, page - 1, page, page + 1, pages].filter((p) => p >= 1 && p <= pages))).sort((a, b) => a - b);
  return (
    <nav aria-label="Pages" className="flex items-center gap-1">
      {page > 1 && <Link href={href(page - 1)} className="adm-btn-ghost adm-btn-sm" aria-label="Previous page"><Icon name="chevronLeft" size={16} /></Link>}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-adm-muted">…</span>}
          <Link href={href(n)} aria-current={n === page ? 'page' : undefined} className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[13px] font-medium ${n === page ? 'bg-adm-green text-white' : 'text-adm-text hover:bg-adm-bg'}`}>{n}</Link>
        </span>
      ))}
      {page < pages && <Link href={href(page + 1)} className="adm-btn-ghost adm-btn-sm" aria-label="Next page"><Icon name="chevronRight" size={16} /></Link>}
    </nav>
  );
}

export const fmtDateTime = (v: unknown) => {
  if (!v) return '—';
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
};
export const fmtDay = (v: unknown) => {
  if (!v) return '—';
  const s = String(v);
  const d = new Date(s.length === 10 ? `${s}T00:00:00Z` : s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: s.length === 10 ? 'UTC' : 'Asia/Kolkata' });
};
