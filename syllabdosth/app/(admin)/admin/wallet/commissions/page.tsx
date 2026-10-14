import type { Metadata } from 'next';
import { CommissionForm } from '@/components/admin/commission-form';
import { Card, Empty, Flash, PageHeader, StatusBadge, fmtDay } from '@/components/admin/ui';
import { isDemo } from '@/lib/config';
import { createAdminClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Commissions' };
export const dynamic = 'force-dynamic';

type Franchise = { id: string; name: string };
type CommissionRow = {
  id: string;
  amount: number | string;
  source_type: string;
  source_ref: string;
  status: string;
  note: string;
  created_at: string;
  organisations: { name: string } | null;
};

const SOURCE_LABEL: Record<string, string> = { enrollment: 'Course enrolment', booking: 'Service booking', other: 'Other' };

export default async function CommissionsPage() {
  let franchises: Franchise[] = [];
  let rows: CommissionRow[] = [];
  let loadError = '';

  if (!isDemo) {
    try {
      const admin = createAdminClient();
      const [org, com] = await Promise.all([
        admin.from('organisations').select('id,name').eq('type', 'franchise').order('name'),
        admin
          .from('commissions')
          .select('id,amount,source_type,source_ref,status,note,created_at,organisations(name)')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (org.error || com.error) loadError = (org.error ?? com.error)!.message;
      franchises = (org.data ?? []) as Franchise[];
      rows = (com.data ?? []) as unknown as CommissionRow[];
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Could not load commissions.';
    }
  }

  return (
    <>
      <PageHeader
        title="Commissions"
        crumbs={[{ href: '/admin/wallet', label: 'Wallet' }, { label: 'Commissions' }]}
        sub="Record the commission a franchise has earned. It is credited to the franchise wallet straight away."
      />

      {isDemo && (
        <Flash tone="orange">Demo mode: connect Supabase to record real commissions.</Flash>
      )}
      {loadError && <Flash tone="red">Could not load commissions: {loadError}</Flash>}
      {!isDemo && !franchises.length && !loadError && (
        <Flash tone="orange">
          No franchise organisations yet. Add one under Manage Organisation with the type “Franchise”, then record its commissions here.
        </Flash>
      )}

      <Card title="Record a commission" className="mb-6">
        <CommissionForm franchises={isDemo ? [] : franchises} />
      </Card>

      <Card title="Recent commissions" pad={false}>
        {rows.length === 0 ? (
          <Empty title="No commissions yet" text="Commissions you record will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead className="border-b border-adm-line text-left text-[12px] uppercase tracking-wide text-adm-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Franchise</th>
                  <th className="px-5 py-3 font-semibold">For</th>
                  <th className="px-5 py-3 font-semibold">Reference</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-adm-line last:border-0">
                    <td className="px-5 py-3 whitespace-nowrap">{fmtDay(r.created_at)}</td>
                    <td className="px-5 py-3">{r.organisations?.name ?? '—'}</td>
                    <td className="px-5 py-3">{SOURCE_LABEL[r.source_type] ?? r.source_type}</td>
                    <td className="px-5 py-3 font-mono text-[13px]">{r.source_ref}</td>
                    <td className="px-5 py-3 text-right font-semibold">₹{Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3"><StatusBadge value={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
