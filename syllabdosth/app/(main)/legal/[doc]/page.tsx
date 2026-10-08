import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader, Section } from '@/components/ui';
import { getContent } from '@/lib/cms/content';

const KEYS: Record<string, string> = { terms: 'page.terms', privacy: 'page.privacy' };

export async function generateMetadata({ params }: { params: { doc: string } }): Promise<Metadata> {
  if (!KEYS[params.doc]) return {};
  const d = await getContent<{ title: string }>(KEYS[params.doc]);
  return { title: d.title };
}

/** Text is edited in Admin → CMS → Terms & Privacy. */
export default async function LegalPage({ params }: { params: { doc: string } }) {
  const key = KEYS[params.doc];
  if (!key) notFound();
  const d = await getContent<{ title: string; body: string }>(key);
  const paras = d.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <Section>
      <PageHeader title={d.title} />
      <div className="card max-w-3xl space-y-4">{paras.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div>
    </Section>
  );
}
