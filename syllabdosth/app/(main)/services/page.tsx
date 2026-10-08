import type { Metadata } from 'next';
import Link from 'next/link';
import { ServiceCard } from '@/components/cards';
import { PageHeader, Section } from '@/components/ui';
import { listServices } from '@/lib/data';
import { getContent } from '@/lib/cms/content';

type P = { services: { title: string; sub: string; groupTitle: string; groupText: string } };

export const metadata: Metadata = { title: 'Book a verified professional' };

export default async function ServicesPage({ searchParams }: { searchParams: { category?: string } }) {
  const [all, pages] = await Promise.all([listServices(), getContent<P>('page.listings')]);
  const t = pages.services;
  const cats = Array.from(new Set(all.map((s) => s.category)));
  const services = searchParams.category ? all.filter((s) => s.category === searchParams.category) : all;
  return (
    <Section>
      <PageHeader crumbs={[{ href: '/', label: 'Home' }, { label: 'Services' }]} title={t.title} underline sub={t.sub} />
      <div className="mb-10 flex flex-wrap gap-2">
        <Link href="/services" className={`rounded-full px-5 py-2.5 text-[14px] font-semibold transition ${!searchParams.category ? 'bg-noir text-white shadow-md' : 'bg-white hover:-translate-y-0.5 hover:bg-taupe-light'}`}>All services</Link>
        {cats.map((c) => (
          <Link key={c} href={`/services?category=${encodeURIComponent(c)}`} className={`rounded-full px-5 py-2.5 text-[14px] font-semibold transition ${searchParams.category === c ? 'bg-noir text-white shadow-md' : 'bg-white hover:-translate-y-0.5 hover:bg-taupe-light'}`}>{c}</Link>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {services.map((s, i) => <div key={s.id} data-reveal style={{ "--d": `${(i % 3) * 0.1}s` } as React.CSSProperties}><ServiceCard service={s} /></div>)}
      </div>
      <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-card bg-cream p-8 md:flex-row md:items-center">
        <div>
          <h2 className="h3">{t.groupTitle}</h2>
          <p className="mt-2 text-ink-soft">{t.groupText}</p>
        </div>
        <Link href="/group-booking" className="btn-primary">Plan a group booking</Link>
      </div>
    </Section>
  );
}
