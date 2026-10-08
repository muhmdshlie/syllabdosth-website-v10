import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ServiceCard } from '@/components/cards';
import { Avatar, Breadcrumbs, Section } from '@/components/ui';
import { getProfessionalBySlug, listServices } from '@/lib/data';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getProfessionalBySlug(params.slug);
  return p ? { title: p.name, description: p.bio } : {};
}

export default async function ProPage({ params }: { params: { slug: string } }) {
  const pro = await getProfessionalBySlug(params.slug);
  if (!pro) notFound();
  const services = (await listServices()).filter((s) => pro.service_ids.includes(s.id));
  return (
    <Section>
      <Breadcrumbs items={[{ href: '/services', label: 'Services' }, { label: pro.name }]} />
      <div className="card mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar text={pro.initials} size={88} dark src={pro.photo_url ?? undefined} />
        <div className="flex-1">
          <h1 className="h1">{pro.name}</h1>
          <p className="mt-1 text-ink-soft">{pro.title} · {pro.city}</p>
          <p className="mt-3 flex flex-wrap gap-2 text-[13px] font-semibold">
            {pro.verified && <span className="rounded-full bg-taupe px-3 py-1">✓ Syllabdosth verified</span>}
            <span className="rounded-full bg-muted px-3 py-1">★ {pro.rating}</span>
            <span className="rounded-full bg-muted px-3 py-1">{pro.bookings_count}+ bookings</span>
          </p>
          <p className="mt-4 max-w-2xl">{pro.bio}</p>
        </div>
      </div>
      <h2 className="h2 mb-6 mt-12">Book {pro.name.split(' ')[0]}</h2>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => <ServiceCard key={s.id} service={s} />)}
      </div>
      <p className="mt-8 text-[14px] text-ink-deep">Want to be listed like this? <Link href="/apply/professional" className="font-semibold underline">Register as a professional</Link>.</p>
    </Section>
  );
}
