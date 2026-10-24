import type { Metadata } from 'next';
import { Card, Empty, Flash, PageHeader, StatusBadge, fmtDateTime } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/auth';
import { formatINR, getWalletOverview } from '@/lib/wallet';

export const metadata: Metadata = { title: 'Wallet' };
export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  commission: 'Commission',
  reversal: 'Reversal',
  credit: 'Credit',
  debit: 'Debit',
  refund: 'Refund',
  payout: 'Payout',
  adjustment: 'Adjustment',
};

export default async function AdminWalletPage() {
  await requireAdmin();
  let overview: Awaited<ReturnType<typeof getWalletOverview>> | null = null;
  let loadError = '';
  try {
    overview = await getWalletOverview();
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Could not load wallet figures.';
  }

  const metrics: [string, string][] = overview
    ? [
        ['Total wallet balances', formatINR(overview.totalBalance)],
        ['Total commissions (credited)', formatINR(overview.totalCommissions)],
        ['Reversed commissions', formatINR(overview.reversedCommissions)],
        ['Franchise wallets', String(overview.franchiseCount)],
        ['Pending payout requests', '—'],
        ['Completed payouts', '—'],
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Wallet"
        crumbs={[{ label: 'Wallet' }]}
        sub="Franchise balances, commissions, payouts and refunds."
      />

      {loadError && <Flash tone="red">Could not load wallet figures: {loadError}</Flash>}
      {!loadError && overview && overview.franchiseCount === 0 && (
        <Flash tone="orange">No franchise wallets yet. A wallet is created the first time you record a commission for a franchise.</Flash>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {metrics.map(([label, value]) => (
          <Card key={label}>
            <p className="text-[13px] text-adm-muted">{label}</p>
            <p className="mt-2 text-[24px] font-semibold text-adm-text">{value}</p>
          </Card>
        ))}
      </div>

      <Card title="Recent wallet transactions" className="mt-6" pad={false}>
        {!overview || overview.recent.length === 0 ? (
          <Empty title="No transactions yet" text="Commissions, payouts and refunds will show here as they are recorded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead className="border-b border-adm-line text-left text-[12px] uppercase tracking-wide text-adm-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Franchise</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  <th className="px-5 py-3 text-right font-semibold">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {overview.recent.map((r) => (
                  <tr key={r.id} className="border-b border-adm-line last:border-0">
                    <td className="px-5 py-3 whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                    <td className="px-5 py-3">{r.franchise}</td>
                    <td className="px-5 py-3"><StatusBadge value={TYPE_LABEL[r.entry_type] ? r.entry_type : 'other'} /></td>
                    <td className="px-5 py-3">{r.description}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${r.amount < 0 ? 'text-[#b3321a]' : 'text-[#16784f]'}`}>{formatINR(r.amount)}</td>
                    <td className="px-5 py-3 text-right">{formatINR(r.balance_after)}</td>
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
