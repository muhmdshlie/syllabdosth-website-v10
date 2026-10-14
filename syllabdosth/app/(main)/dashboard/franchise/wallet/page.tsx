import type { Metadata } from 'next';
import { DashboardShell, Panel, StatGrid, Table } from '@/components/dashboard';
import { requireRole } from '@/lib/auth';
import { formatINR, getFranchiseWallet } from '@/lib/wallet';

export const metadata: Metadata = {
  title: 'Franchise wallet',
};
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

export default async function FranchiseWalletPage() {
  const user = await requireRole(['franchise'], '/dashboard/franchise/wallet');
  const organisationId = (user.profile as { organisation_id?: string | null }).organisation_id ?? null;

  const tabs = [
    { href: '/dashboard/franchise', label: 'Overview' },
    { href: '/dashboard/franchise/wallet', label: 'Wallet', active: true },
  ];

  if (!organisationId) {
    return (
      <DashboardShell user={user} title="Wallet" tabs={tabs}>
        <Panel title="Account not linked">
          <p className="text-ink-soft">
            Your login isn’t linked to a franchise yet. Ask the Syllabdosth team to link your account, then reload this page.
          </p>
        </Panel>
      </DashboardShell>
    );
  }

  let wallet: Awaited<ReturnType<typeof getFranchiseWallet>> = null;
  let loadError = '';
  try {
    wallet = await getFranchiseWallet(organisationId);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Could not load your wallet.';
  }

  return (
    <DashboardShell user={user} title="Wallet" tabs={tabs}>
      {loadError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load your wallet: {loadError}
        </p>
      )}

      <Panel title="Available balance">
        <p className="font-serif text-[40px] font-bold leading-none">{formatINR(wallet?.available ?? 0)}</p>
        <p className="mt-2 text-ink-soft">Total earned: {formatINR(wallet?.earned ?? 0)}</p>
        {wallet && wallet.reserved > 0 && (
          <p className="mt-1 text-ink-soft">Reserved for payout: {formatINR(wallet.reserved)}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" disabled className="btn-secondary btn-sm opacity-60">
            Request payout
          </button>
          <span className="text-sm text-ink-soft">Payout requests aren’t available yet.</span>
        </div>
      </Panel>

      <StatGrid
        items={[
          ['Total earned', formatINR(wallet?.earned ?? 0)],
          ['Available', formatINR(wallet?.available ?? 0)],
          ['Reserved', formatINR(wallet?.reserved ?? 0)],
          ['Wallet status', wallet ? wallet.status : 'Not created yet'],
        ]}
      />

      <Panel title="Recent transactions">
        <Table
          head={['Date', 'Type', 'Description', 'Amount', 'Balance after']}
          empty="No transactions yet."
          rows={(wallet?.recent ?? []).map((r) => [
            new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
            TYPE_LABEL[r.entry_type] ?? r.entry_type,
            r.description,
            <span key="a" className={r.amount < 0 ? 'text-red-700' : 'text-green-700'}>{formatINR(r.amount)}</span>,
            formatINR(r.balance_after),
          ])}
        />
      </Panel>
    </DashboardShell>
  );
}
