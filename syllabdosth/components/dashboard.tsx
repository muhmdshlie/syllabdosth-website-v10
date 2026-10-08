import Link from 'next/link';
import type { ReactNode } from 'react';
import { signOut } from '@/app/auth-actions';
import type { CurrentUser } from '@/lib/auth';

const roleLabel = { learner: 'Learner', professional: 'Professional', faculty: 'Faculty', admin: 'Admin' } as const;

export function DashboardShell({ user, title, tabs, children }: { user: CurrentUser; title: string; tabs?: { href: string; label: string; active?: boolean }[]; children: ReactNode }) {
  return (
    <section className="bg-paper py-12 sm:py-16">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow text-ink-deep">{roleLabel[user.profile.role]} dashboard</p>
            <h1 className="h1 mt-2">{title}</h1>
            <p className="mt-1 text-ink-deep-muted">Signed in as {user.profile.full_name || user.email || user.profile.phone}</p>
          </div>
          <form action={signOut}><button className="btn-secondary btn-sm" type="submit">Log out</button></form>
        </div>
        {tabs && (
          <nav aria-label="Dashboard sections" className="mt-10 flex gap-7 overflow-x-auto border-b border-noir/15 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => (
              <Link key={t.href} href={t.href} aria-current={t.active ? 'page' : undefined} className={`-mb-px whitespace-nowrap border-b-2 pb-3.5 pt-1 font-display text-[12px] font-medium uppercase tracking-[0.18em] transition-colors ${t.active ? 'border-noir text-noir' : 'border-transparent text-ink-soft hover:text-noir'}`}>{t.label}</Link>
            ))}
          </nav>
        )}
        <div className="mt-8 space-y-6">{children}</div>
      </div>
    </section>
  );
}

export function StatGrid({ items }: { items: [string, string | number][] }) {
  return (
    <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="liquid-glass-light rounded-card p-6">
          <dd className="font-serif text-[34px] font-bold leading-none">{value}</dd>
          <dt className="mt-2 text-[14px] text-ink-soft">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="card">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="h3">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Responsive table: rows become stacked cards on small screens. */
export function Table({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty: string }) {
  if (!rows.length) return <p className="rounded-2xl bg-muted p-6 text-center text-ink-soft">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[14px]">
        <thead className="hidden md:table-header-group">
          <tr className="border-b border-line text-[12px] uppercase tracking-wide text-ink-soft">{head.map((h) => <th key={h} className="py-3 pr-4 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="block border-b border-line py-3 md:table-row md:py-0">
              {r.map((c, j) => (
                <td key={j} className="block py-1 pr-4 align-top md:table-cell md:py-4">
                  <span className="mr-2 text-[12px] font-semibold text-ink-soft md:hidden">{head[j]}:</span>{c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
