import type { Metadata } from 'next';
import { Card, Empty, Flash, PageHeader } from '@/components/admin/ui';

export const metadata: Metadata = { title: 'Wallet' };

const METRICS = [
  'Total wallet balances',
  'Total commissions',
  'Pending commissions',
  'Pending payout requests',
  'Completed payouts',
  'Refund totals',
];

export default function AdminWalletPage() {
  return (
    <>
      <PageHeader
        title="Wallet"
        crumbs={[{ label: 'Wallet' }]}
        sub="Franchise balances, commissions, payouts and refunds."
      />

      <Flash tone="orange">
        The wallet ledger isn’t set up in the database yet, so the figures below are empty. They will fill in once the wallet
        migration is run and commissions are recorded.
      </Flash>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {METRICS.map((metric) => (
          <Card key={metric}>
            <p className="text-[13px] text-adm-muted">{metric}</p>
            <p className="mt-2 text-[24px] font-semibold text-adm-text">—</p>
          </Card>
        ))}
      </div>

      <Card title="Recent wallet transactions" className="mt-6">
        <Empty
          title="No transactions yet"
          text="Commissions, payouts and refunds will show here as they are recorded."
        />
      </Card>
    </>
  );
}
