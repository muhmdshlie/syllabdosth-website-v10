import type { Metadata } from 'next';
import Link from 'next/link';
import { FacultyCard } from '@/components/cards';
import { PageHeader, Section } from '@/components/ui';
import { Photo } from '@/components/motion';
import { getContent } from '@/lib/cms/content';
import { listFaculty } from '@/lib/data';

type About = { title: string; sub: string; image: string; whyTitle: string; whyText: string; partnerTitle: string; partnerText: string; partnerCta: string; facultyTitle: string };

export const metadata: Metadata = { title: 'About' };

export default async function AboutPage() {
  const [faculty, a, home] = await Promise.all([listFaculty(), getContent<About>('page.about'), getContent<{ stats: { value: string; label: string }[] }>('page.home')]);
  return (
    <>
      <Section>
        <PageHeader crumbs={[{ href: '/', label: 'Home' }, { label: 'About' }]} title={a.title} sub={a.sub} />
        {a.image && <Photo src={a.image} alt="" eager className="mb-10 h-64 w-full rounded-card sm:h-[420px]" />}
        <dl className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {home.stats.map((s, i) => <div key={i} className="card !p-6"><dd className="font-serif text-[36px] font-bold">{s.value}</dd><dt className="text-[14px] text-ink-soft">{s.label}</dt></div>)}
        </dl>
      </Section>
      <Section tone="cream">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="h2">{a.whyTitle}</h2>
            <p className="body-l mt-4 whitespace-pre-line text-ink-soft">{a.whyText}</p>
          </div>
          <div>
            <h2 className="h2">{a.partnerTitle}</h2>
            <p className="body-l mt-4 whitespace-pre-line text-ink-soft">{a.partnerText}</p>
            <Link href="/contact" className="btn-primary mt-6">{a.partnerCta}</Link>
          </div>
        </div>
      </Section>
      <Section>
        <h2 className="h2 mb-8">{a.facultyTitle}</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{faculty.map((f) => <FacultyCard key={f.id} f={f} />)}</div>
      </Section>
    </>
  );
}
