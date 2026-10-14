import 'server-only';
import { isDemo } from './config';
import { createAdminClient } from './supabase/server';

/** Server-side reads for the wallet pages. Amounts come from the database, never from the browser. */

export type LedgerLine = {
  id: string;
  entry_type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  franchise: string;
};

export type FranchiseWalletLine = {
  organisation_id: string;
  name: string;
  balance: number;
  reserved: number;
  earned: number;
  status: string;
};

const num = (v: unknown) => Number(v ?? 0);
const sum = (rows: Record<string, unknown>[], key = 'amount') => rows.reduce((total, r) => total + num(r[key]), 0);

function ledgerLines(rows: Record<string, unknown>[] | null): LedgerLine[] {
  return (rows ?? []).map((r) => {
    const wallet = r.wallets as { organisations?: { name?: string } | null } | null;
    return {
      id: String(r.id),
      entry_type: String(r.entry_type),
      amount: num(r.amount),
      balance_after: num(r.balance_after),
      description: String(r.description ?? ''),
      created_at: String(r.created_at),
      franchise: wallet?.organisations?.name ?? '—',
    };
  });
}

export async function getWalletOverview() {
  if (isDemo) {
    return { franchiseCount: 0, totalBalance: 0, totalCommissions: 0, reversedCommissions: 0, recent: [] as LedgerLine[] };
  }
  const admin = createAdminClient();
  const [wallets, commissions, ledger] = await Promise.all([
    admin.from('wallets').select('organisation_id,balance,reserved,status'),
    admin.from('commissions').select('organisation_id,amount,status'),
    admin
      .from('wallet_ledger')
      .select('id,entry_type,amount,balance_after,description,created_at,wallets(organisations(name))')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);
  const error = wallets.error ?? commissions.error ?? ledger.error;
  if (error) throw new Error(error.message);

  const credited = (commissions.data ?? []).filter((c) => c.status === 'credited');
  const reversed = (commissions.data ?? []).filter((c) => c.status === 'reversed');
  return {
    franchiseCount: wallets.data?.length ?? 0,
    totalBalance: sum(wallets.data ?? [], 'balance'),
    totalCommissions: sum(credited),
    reversedCommissions: sum(reversed),
    recent: ledgerLines(ledger.data as Record<string, unknown>[] | null),
  };
}

export async function getFranchiseWallets(): Promise<FranchiseWalletLine[]> {
  if (isDemo) return [];
  const admin = createAdminClient();
  const [wallets, commissions] = await Promise.all([
    admin.from('wallets').select('organisation_id,balance,reserved,status,organisations(name)').order('created_at'),
    admin.from('commissions').select('organisation_id,amount').eq('status', 'credited'),
  ]);
  const error = wallets.error ?? commissions.error;
  if (error) throw new Error(error.message);

  return (wallets.data ?? []).map((w) => {
    const org = w.organisations as unknown as { name?: string } | null;
    return {
      organisation_id: String(w.organisation_id),
      name: org?.name ?? 'Unnamed franchise',
      balance: num(w.balance),
      reserved: num(w.reserved),
      earned: sum((commissions.data ?? []).filter((c) => c.organisation_id === w.organisation_id)),
      status: String(w.status),
    };
  });
}

/** The wallet for one franchise, found through the profile's organisation link. */
export async function getFranchiseWallet(organisationId: string) {
  if (isDemo) return null;
  const admin = createAdminClient();
  const { data: wallet, error } = await admin
    .from('wallets')
    .select('id,balance,reserved,status')
    .eq('organisation_id', organisationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!wallet) return null;

  const [commissions, ledger] = await Promise.all([
    admin.from('commissions').select('amount').eq('organisation_id', organisationId).eq('status', 'credited'),
    admin
      .from('wallet_ledger')
      .select('id,entry_type,amount,balance_after,description,created_at,wallets(organisations(name))')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  if (commissions.error || ledger.error) throw new Error((commissions.error ?? ledger.error)!.message);

  return {
    balance: num(wallet.balance),
    reserved: num(wallet.reserved),
    available: num(wallet.balance) - num(wallet.reserved),
    earned: sum(commissions.data ?? []),
    status: String(wallet.status),
    recent: ledgerLines(ledger.data as Record<string, unknown>[] | null),
  };
}

export const formatINR = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
