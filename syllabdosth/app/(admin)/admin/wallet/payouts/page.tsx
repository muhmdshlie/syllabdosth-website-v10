import type { Metadata } from 'next';
import { Card, Empty, Flash, PageHeader, fmtDateTime } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/auth';
import { isDemo } from '@/lib/config';
import { createAdminClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Payout requests' };
export const dynamic = 'force-dynamic';

type PayoutRow = {
  id: string;
  amount: string | number;
  balance_after: string | number;
  description: string;
  created_at: string;
  wallets: { organisation_id: string } | null;
};

const money = (value: string | number) =>
  `₹${Math.abs(Number(value)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const crumbs = [{ href: '/admin/wallet', label: 'Wallet' }, { label: 'Payout requests' }];

export default async function AdminPayoutsPage() {
  await requireAdmin();
  if (isDemo) {
    return (
      <>
        <PageHeader title="Payout requests" crumbs={crumbs} sub="Money paid out from franchise wallets." />
        <Card>
          <Empty title="Connect the database to see payouts" text="Demo mode has no wallet data." />
        </Card>
      </>
    );
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from('wallet_ledger')
    .select('id, amount, balance_after, description, created_at, wallets!inner(organisation_id)')
    .eq('entry_type', 'payout')
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as PayoutRow[];

  const orgIds = Array.from(
    new Set(rows.map((r) => r.wallets?.organisation_id).filter((id): id is string => !!id)),
  );
  const { data: orgs } = orgIds.length
    ? await db.from('organisations').select('id, name').in('id', orgIds)
    : { data: [] as { id: string; name: string }[] };
  const names = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  return (
    <>
      <PageHeader
        title="Payout requests"
        crumbs={crumbs}
        sub="Money paid out from franchise wallets, from the wallet ledger."
      />

      {error ? (
        <Flash tone="red">Couldn’t load payouts: {error.message}</Flash>
      ) : (
        <Flash tone="orange">
          Franchises can’t request payouts yet, so this lists payout entries already recorded in the ledger.
        </Flash>
      )}

      <Card title="Payouts">
        {!error && rows.length === 0 ? (
          <Empty title="No payouts recorded yet" text="Payouts will appear here once they are recorded in the ledger." />
        ) : error ? null : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-adm-line text-[12px] uppercase tracking-wide text-adm-muted">
                  <th className="py-3 pr-4 font-semibold">Date</th>
                  <th className="py-3 pr-4 font-semibold">Franchise</th>
                  <th className="py-3 pr-4 font-semibold">Description</th>
                  <th className="py-3 pr-4 text-right font-semibold">Amount</th>
                  <th className="py-3 text-right font-semibold">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const orgId = row.wallets?.organisation_id ?? '';
                  return (
                    <tr key={row.id} className="border-b border-adm-line last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap">{fmtDateTime(row.created_at)}</td>
                      <td className="py-3 pr-4">{names.get(orgId) ?? orgId}</td>
                      <td className="py-3 pr-4">{row.description || '—'}</td>
                      <td className="py-3 pr-4 text-right font-medium">{money(row.amount)}</td>
                      <td className="py-3 text-right">{money(row.balance_after)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
