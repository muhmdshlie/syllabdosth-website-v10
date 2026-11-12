import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Card, Empty, Flash, PageHeader } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/auth';

const SECTIONS: Record<string, { title: string; sub: string; empty: string; text: string }> = {
  franchises: {
    title: 'Franchise wallets',
    sub: 'Balance, earnings, pending settlements and payouts for each franchise.',
    empty: 'No franchise wallets yet',
    text: 'A wallet is created for each franchise once it is approved.',
  },
  payouts: {
    title: 'Payout requests',
    sub: 'Requests from franchises to withdraw their balance.',
    empty: 'No payout requests',
    text: 'Requests will appear here once franchises can ask for a payout.',
  },
  refunds: {
    title: 'Refunds',
    sub: 'Refund requests and how they affect commissions and balances.',
    empty: 'No refunds recorded',
    text: 'Refunds will be listed here with the order and commission they affect.',
  },
  reconciliation: {
    title: 'Reconciliation',
    sub: 'Match internal wallet records against payment-provider or bank records.',
    empty: 'Nothing to reconcile yet',
    text: 'Payment-provider records are not connected yet, so there is nothing to match.',
  },
};

type Params = { params: { section: string } };

export function generateMetadata({ params }: Params): Metadata {
  const section = SECTIONS[params.section];
  return { title: section ? section.title : 'Wallet' };
}

export default async function AdminWalletSectionPage({ params }: Params) {
  await requireAdmin();
  const section = SECTIONS[params.section];
  if (!section) notFound();

  return (
    <>
      <PageHeader
        title={section.title}
        crumbs={[{ href: '/admin/wallet', label: 'Wallet' }, { label: section.title }]}
        sub={section.sub}
      />

      <Flash tone="orange">
        The wallet ledger isn’t set up in the database yet, so this list is empty.
      </Flash>

      <Card>
        <Empty title={section.empty} text={section.text} />
      </Card>
    </>
  );
}
