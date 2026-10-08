import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader, Section } from '@/components/ui';
import { getContent } from '@/lib/cms/content';
import { listFaqs } from '@/lib/lms';

export const metadata: Metadata = { title: 'Help & FAQ' };

export default async function HelpPage() {
  const [faqs, pages] = await Promise.all([listFaqs(), getContent<{ help: { title: string; sub: string } }>('page.listings')]);
  return (
    <Section>
      <PageHeader crumbs={[{ href: '/', label: 'Home' }, { label: 'Help' }]} title={pages.help.title} sub={pages.help.sub || undefined} />
      <div className="max-w-3xl divide-y divide-ink/10 liquid-glass-light rounded-card px-6">
        {faqs.map((f) => (
          <details key={f.id} className="group py-5" open>
            <summary className="cursor-pointer list-none font-serif text-[18px] font-bold">{f.question}</summary>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{f.answer}</p>
          </details>
        ))}
      </div>
      <p className="mt-8">Still stuck? <Link href="/contact" className="font-semibold underline">Contact us</Link>.</p>
    </Section>
  );
}
