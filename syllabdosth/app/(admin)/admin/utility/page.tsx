import type { Metadata } from 'next';
import Link from 'next/link';
import { clearCacheAction } from '@/app/admin-actions';
import { RunButton } from '@/components/admin/controls';
import { Icon } from '@/components/admin/icons';
import { Card, PageHeader, StatusBadge } from '@/components/admin/ui';
import { countRecords } from '@/lib/admin/crud';
import { resourceList } from '@/lib/admin/resources';
import { isDemo, SUPABASE_URL } from '@/lib/config';

export const metadata: Metadata = { title: 'Utility' };

const TABLES = ['courses', 'course_lessons', 'enrollments', 'profiles', 'faculty', 'bookings', 'blog_posts', 'quizzes', 'submissions', 'live_classes', 'support_tickets', 'media', 'site_content', 'activity_log'];

export default async function UtilityPage() {
  const counts = await Promise.all(TABLES.map(async (t) => { try { return await countRecords(t); } catch { return null; } }));
  const missing = TABLES.filter((_, i) => counts[i] === null);
  return (
    <>
      <PageHeader title="Utility" crumbs={[{ label: 'Utility' }]} sub="Exports, cache and backups." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Export data" className="xl:row-span-2">
          <span id="export" className="block -translate-y-24" />
          <p className="mb-4 text-[14px] text-adm-muted">Download any table as a CSV file (opens in Excel or Google Sheets). Each list page also has its own Export button that keeps your filters.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {resourceList.map((r) => (
              <li key={r.key}><a href={`/admin/export/${r.key}`} className="flex items-center justify-between rounded-xl border border-adm-line px-3 py-2.5 text-[14px] hover:border-adm-green hover:text-adm-green">{r.label}<Icon name="download" size={16} /></a></li>
            ))}
          </ul>
        </Card>
        <Card title="Clear cache">
          <span id="cache" className="block -translate-y-24" />
          <p className="mb-4 text-[14px] text-adm-muted">The website refreshes by itself when you save. If a change doesn’t show, clear the cache and reload the page.</p>
          <RunButton action={clearCacheAction} label="Clear cache now" doneLabel="Cache cleared" icon="cache" />
        </Card>
        <Card title="Backup">
          <span id="backup" className="block -translate-y-24" />
          <p className="mb-4 text-[14px] text-adm-muted">Downloads all website content (courses, lessons, pages, settings, blog, FAQs…) as one JSON file. Passwords and API keys are left out. Supabase also keeps daily backups on paid plans.</p>
          <a href="/admin/backup" className="adm-btn-primary"><Icon name="download" size={18} />Download backup</a>
        </Card>
      </div>
      <Card title="System info" className="mt-6">
        <span id="system" className="block -translate-y-24" />
        <dl className="grid gap-4 text-[14px] sm:grid-cols-3">
          <div><dt className="text-adm-muted">Mode</dt><dd className="mt-1">{isDemo ? <StatusBadge value="Demo (no database)" tone="orange" /> : <StatusBadge value="Live (Supabase)" tone="green" />}</dd></div>
          <div><dt className="text-adm-muted">Database</dt><dd className="mt-1 break-all">{isDemo ? '—' : new URL(SUPABASE_URL).host}</dd></div>
          <div><dt className="text-adm-muted">Site address</dt><dd className="mt-1 break-all">{process.env.NEXT_PUBLIC_SITE_URL ?? 'not set'}</dd></div>
        </dl>
        {missing.length > 0 && <p className="mt-4 rounded-xl bg-adm-red-soft px-4 py-3 text-[14px] text-[#b3321a]">Missing tables: {missing.join(', ')}. Run <code>supabase/migrations/0003_admin_panel.sql</code> in Supabase → SQL Editor.</p>}
        <table className="mt-5 w-full max-w-xl text-[14px]">
          <tbody>{TABLES.map((t, i) => <tr key={t} className="border-t border-adm-line"><td className="py-2 font-mono text-[13px]">{t}</td><td className="py-2 text-right">{counts[i] === null ? <span className="text-adm-red">missing</span> : counts[i]!.toLocaleString('en-IN')}</td></tr>)}</tbody>
        </table>
        <p className="mt-4 text-[14px]"><Link href="/admin/activity" className="font-medium text-adm-green hover:underline">See the activity log →</Link></p>
      </Card>
    </>
  );
}
