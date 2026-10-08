import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, PageHeader, StatusBadge } from '@/components/admin/ui';
import { isDemo, SITE_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/config';

export const metadata: Metadata = { title: 'Login methods' };

async function providers(): Promise<Record<string, boolean> | null> {
  if (isDemo) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY }, cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return (await res.json()).external ?? null;
  } catch { return null; }
}

export default async function LoginMethods() {
  const p = await providers();
  const project = isDemo ? '' : new URL(SUPABASE_URL).host.split('.')[0];
  const dash = project ? `https://supabase.com/dashboard/project/${project}/auth/providers` : 'https://supabase.com/dashboard';
  const rows: [string, string, boolean | undefined, string][] = [
    ['email', 'Email + password', p?.email, 'On by default. For reliable delivery add your SMTP under Supabase → Authentication → SMTP.'],
    ['google', 'Google', p?.google, `Needs a Google OAuth client. Authorised redirect URI: ${SUPABASE_URL || 'https://<project>.supabase.co'}/auth/v1/callback`],
    ['phone', 'Phone number (OTP by SMS)', p?.phone, 'Needs an SMS provider (MSG91 for India, Twilio or Vonage). SMS is paid per message and needs DLT registration in India.'],
  ];
  return (
    <>
      <PageHeader title="Login methods" crumbs={[{ label: 'SMS & OTP' }, { label: 'Login methods' }]} sub="How people can sign in. These switches live in Supabase, so this page shows their current state."
        actions={<a href={dash} target="_blank" rel="noreferrer" className="adm-btn-primary">Open Supabase → Providers</a>} />
      <Card pad={false}>
        <table className="w-full">
          <thead className="bg-[#F8FBFA]"><tr><th className="adm-th">Method</th><th className="adm-th">Status</th><th className="adm-th">How to set up</th></tr></thead>
          <tbody>
            {rows.map(([k, label, on, how]) => (
              <tr key={k} className="border-t border-adm-line">
                <td className="adm-td font-medium">{label}</td>
                <td className="adm-td">{isDemo ? <StatusBadge value="Demo mode" tone="grey" /> : on === undefined ? <StatusBadge value="Unknown" tone="grey" /> : on ? <StatusBadge value="On" tone="green" /> : <StatusBadge value="Off" tone="red" />}</td>
                <td className="adm-td text-[13px] text-adm-muted">{how}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Redirect URLs to add in Supabase" className="mt-6">
        <p className="text-[14px] text-adm-muted">Supabase → Authentication → URL Configuration → Redirect URLs:</p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-adm-bg p-4 text-[13px]">{`${SITE_URL}/auth/callback\nhttp://localhost:3000/auth/callback`}</pre>
        <p className="mt-4 text-[14px]">SMS provider details for your records: <Link href="/admin/settings/sms" className="font-medium text-adm-green hover:underline">SMS settings</Link>.</p>
      </Card>
    </>
  );
}
