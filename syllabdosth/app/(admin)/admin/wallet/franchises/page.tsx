import type { Metadata } from 'next';
import { Card, Empty, Flash, PageHeader, StatusBadge } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/auth';
import { formatINR, getFranchiseWallets } from '@/lib/wallet';

export const metadata: Metadata = { title: 'Franchise wallets' };
export const dynamic = 'force-dynamic';

export default async function FranchiseWalletsPage() {
  await requireAdmin();
  let wallets: Awaited<ReturnType<typeof getFranchiseWallets>> = [];
  let loadError = '';
  try {
    wallets = await getFranchiseWallets();
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Could not load franchise wallets.';
  }

  return (
    <>
      <PageHeader
        title="Franchise wallets"
        crumbs={[{ href: '/admin/wallet', label: 'Wallet' }, { label: 'Franchise wallets' }]}
        sub="Balance and earnings for each franchise."
      />

      {loadError && <Flash tone="red">Could not load franchise wallets: {loadError}</Flash>}

      <Card pad={false}>
        {wallets.length === 0 ? (
          <Empty title="No franchise wallets yet" text="A wallet is created the first time you record a commission for a franchise." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead className="border-b border-adm-line text-left text-[12px] uppercase tracking-wide text-adm-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Franchise</th>
                  <th className="px-5 py-3 text-right font-semibold">Available</th>
                  <th className="px-5 py-3 text-right font-semibold">Reserved</th>
                  <th className="px-5 py-3 text-right font-semibold">Total earned</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((w) => (
                  <tr key={w.organisation_id} className="border-b border-adm-line last:border-0">
                    <td className="px-5 py-3 font-medium">{w.name}</td>
                    <td className="px-5 py-3 text-right font-semibold">{formatINR(w.balance - w.reserved)}</td>
                    <td className="px-5 py-3 text-right">{formatINR(w.reserved)}</td>
                    <td className="px-5 py-3 text-right">{formatINR(w.earned)}</td>
                    <td className="px-5 py-3"><StatusBadge value={w.status} /></td>
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
