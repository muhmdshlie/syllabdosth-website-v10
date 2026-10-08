import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader, Section } from '@/components/ui';

export const metadata: Metadata = { title: 'Verify a certificate' };

export default function VerifyPage({ searchParams }: { searchParams: { code?: string } }) {
  const code = (searchParams.code ?? '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (code) redirect(`/certificates/${code}`);
  return (
    <Section>
      <PageHeader crumbs={[{ href: '/', label: 'Home' }, { label: 'Verify a certificate' }]} title="Verify a certificate" sub="Enter the certificate number printed on a Syllabdosth certificate to check that it is genuine." />
      <form method="get" className="card flex max-w-xl flex-col gap-3 sm:flex-row">
        <label htmlFor="code" className="sr-only">Certificate number</label>
        <input id="code" name="code" required placeholder="e.g. SD7K2Q9XLM" className="input flex-1 uppercase" />
        <button className="btn-primary" type="submit">Verify</button>
      </form>
    </Section>
  );
}
