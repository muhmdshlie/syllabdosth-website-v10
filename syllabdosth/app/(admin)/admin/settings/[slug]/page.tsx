import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContentPage } from '@/components/admin/content-page';
import { TestEmailForm } from '@/components/admin/test-email';
import { Card } from '@/components/admin/ui';
import { requireRole } from '@/lib/auth';
import { getContent } from '@/lib/cms/content';
import { CONTENT, contentKeyFromSlug } from '@/lib/cms/schema';

const GROUP: Record<string, { href?: string; label: string }> = {
  general: { label: 'Website Settings' }, branding: { label: 'Website Settings' }, seo: { label: 'Website Settings' }, maintenance: { label: 'Website Settings' },
  announcement: { label: 'Marketing' }, email: { label: 'Email Settings' }, sms: { label: 'SMS & OTP' }, addons: { label: 'Addon' },
};

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return { title: CONTENT[contentKeyFromSlug('settings', params.slug)]?.title ?? 'Settings' };
}

export default async function SettingsPage({ params, searchParams }: { params: { slug: string }; searchParams: { reset?: string } }) {
  const key = contentKeyFromSlug('settings', params.slug);
  if (!CONTENT[key] || CONTENT[key].kind !== 'settings') notFound();
  const me = await requireRole(['admin'], '/admin');
  let aside: React.ReactNode;
  if (params.slug === 'email') {
    const s = await getContent<{ adminEmail: string }>('settings.email');
    aside = <>
      <Card title="Test"><TestEmailForm defaultTo={s.adminEmail || me.email || ''} /></Card>
      <Card title="Good SMTP choices">
        <ul className="list-disc space-y-2 pl-5 text-[14px] text-adm-muted">
          <li><b>Zoho Mail</b>: smtp.zoho.in, port 465 (SSL on)</li>
          <li><b>Gmail / Google Workspace</b>: smtp.gmail.com, port 465, with an App Password</li>
          <li><b>Brevo / Resend</b>: good for bulk notifications</li>
        </ul>
        <p className="mt-3 text-[14px]"><Link href="/admin/email-templates" className="font-medium text-adm-green hover:underline">Edit email templates →</Link></p>
      </Card>
    </>;
  } else if (params.slug === 'sms') {
    aside = <Card title="Related"><div className="flex flex-col gap-2"><Link href="/admin/login-methods" className="adm-btn-outline">Login methods (OTP status)</Link><Link href="/admin/sms-templates" className="adm-btn-outline">SMS templates</Link></div></Card>;
  } else if (params.slug === 'addons') {
    aside = <Card title="About add-ons"><ul className="list-disc space-y-2 pl-5 text-[14px] text-adm-muted"><li>The WhatsApp button uses the number in <Link className="text-adm-green" href="/admin/settings/general">General settings</Link>.</li><li>Analytics and Pixel load only on the public website, never in this admin panel.</li><li>The <Link className="text-adm-green" href="/admin/ai">AI Assistant</Link> needs an Anthropic API key; usage is billed by Anthropic.</li></ul></Card>;
  }
  return <ContentPage contentKey={key} crumbs={[{ label: GROUP[params.slug]?.label ?? 'Settings' }, { label: CONTENT[key].title }]} back={`/admin/settings/${params.slug}`} reset={!!searchParams.reset}>{aside}</ContentPage>;
}
