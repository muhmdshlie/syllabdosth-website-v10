import type { Metadata } from 'next';
import { contactAction } from '@/app/actions';
import { ActionForm, Field, SelectField, SubmitButton, TextArea } from '@/components/forms';
import { PageHeader, Section } from '@/components/ui';
import { getContent, getSiteSettings } from '@/lib/cms/content';

type Contact = { title: string; sub: string; topics: string[]; directTitle: string; mapUrl: string };

export const metadata: Metadata = { title: 'Contact us' };

export default async function ContactPage() {
  const [c, site] = await Promise.all([getContent<Contact>('page.contact'), getSiteSettings()]);
  const topics = c.topics.length ? c.topics : ['Something else'];
  return (
    <Section>
      <PageHeader crumbs={[{ href: '/', label: 'Home' }, { label: 'Contact' }]} title={c.title} sub={c.sub} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="card">
          <ActionForm action={contactAction} className="grid gap-5 sm:grid-cols-2">
            <Field label="Your name" name="name" required autoComplete="name" />
            <Field label="Phone number" name="phone" type="tel" required autoComplete="tel" />
            <Field label="Email" name="email" type="email" required autoComplete="email" />
            <SelectField label="Topic" name="topic" options={topics.map((t) => ({ value: t, label: t }))} />
            <TextArea label="Message" name="message" required rows={5} className="sm:col-span-2" />
            <div className="sm:col-span-2"><SubmitButton className="w-full">Send message</SubmitButton></div>
          </ActionForm>
        </div>
        <aside className="card h-fit space-y-4">
          <h2 className="h3">{c.directTitle}</h2>
          {site.phone && <a href={site.phoneHref} className="btn-secondary w-full">Call {site.phone}</a>}
          {site.whatsappUrl && <a href={site.whatsappUrl} target="_blank" rel="noreferrer" className="btn-dark w-full">WhatsApp us</a>}
          <p className="text-[14px] text-ink-soft">{site.email}<br />{site.site}</p>
          {site.address && <p className="whitespace-pre-line text-[14px] text-ink-soft">{site.address}</p>}
          {c.mapUrl && <a href={c.mapUrl} target="_blank" rel="noreferrer" className="btn-secondary w-full">Open in Google Maps</a>}
        </aside>
      </div>
    </Section>
  );
}
