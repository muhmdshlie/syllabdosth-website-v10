import type { Metadata } from 'next';
import { DashboardShell, Panel, StatGrid, Table } from '@/components/dashboard';
import { requireRole } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Franchise wallet',
};

export default async function FranchiseWalletPage() {
  const user = await requireRole(['franchise'], '/dashboard/franchise/wallet');

  return (
    <DashboardShell
      user={user}
      title="Wallet"
      tabs={[
        { href: '/dashboard/franchise', label: 'Overview' },
        { href: '/dashboard/franchise/wallet', label: 'Wallet', active: true },
      ]}
    >
      <Panel title="Available balance">
        <p className="font-serif text-[40px] font-bold leading-none">₹0</p>
        <p className="mt-2 text-ink-soft">Total earnings: ₹0</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" disabled className="btn-secondary btn-sm opacity-60">
            Request payout
          </button>
          <span className="text-sm text-ink-soft">Payout requests aren’t available yet.</span>
        </div>
      </Panel>

      <StatGrid
        items={[
          ['Total commissions', '₹0'],
          ['Pending settlements', '₹0'],
          ['Total paid out', '₹0'],
          ['Refunds', '₹0'],
        ]}
      />

      <Panel title="Recent transactions">
        <Table
          head={['Date', 'Type', 'Description', 'Amount', 'Status']}
          empty="No transactions yet."
          rows={[]}
        />
      </Panel>

      <Panel title="Settlement history">
        <Table
          head={['Reference', 'Amount', 'Date', 'Status']}
          empty="No settlements yet."
          rows={[]}
        />
      </Panel>
    </DashboardShell>
  );
}
