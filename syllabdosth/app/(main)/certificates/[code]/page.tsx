import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader, Section } from '@/components/ui';
import { getSiteSettings } from '@/lib/cms/content';
import { getCourseById, listCourses } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { certificateByCode } from '@/lib/lms';

export const metadata: Metadata = { title: 'Certificate verification', robots: { index: false } };

export default async function CertificatePage({ params }: { params: { code: string } }) {
  const [cert, site] = await Promise.all([certificateByCode(decodeURIComponent(params.code)), getSiteSettings()]);
  const course = cert ? (await getCourseById(cert.course_id)) ?? (await listCourses()).find((c) => c.id === cert.course_id) : null;
  return (
    <Section>
      <PageHeader crumbs={[{ href: '/', label: 'Home' }, { href: '/certificates', label: 'Verify a certificate' }, { label: params.code.toUpperCase() }]} title={cert ? 'Certificate verified' : 'Certificate not found'} />
      {cert ? (
        <div className="card max-w-2xl" data-testid="certificate-valid">
          <p className="eyebrow text-taupe-deep">✓ Genuine {site.siteName} certificate</p>
          <p className="mt-6 font-serif text-[40px] font-medium leading-tight">{cert.student_name}</p>
          <p className="mt-2 text-ink-soft">has successfully completed</p>
          <p className="mt-2 font-display text-[22px] font-medium uppercase tracking-[-0.01em]">{course?.title ?? 'a Syllabdosth course'}</p>
          <dl className="mt-8 grid gap-4 border-t border-line pt-6 text-[14px] sm:grid-cols-2">
            <div><dt className="text-ink-soft">Certificate number</dt><dd className="mt-1 font-mono font-semibold">{cert.code}</dd></div>
            <div><dt className="text-ink-soft">Issued on</dt><dd className="mt-1 font-semibold">{fmtDate(cert.issued_on)}</dd></div>
          </dl>
        </div>
      ) : (
        <div className="card max-w-2xl">
          <p>We couldn’t find a certificate with the number <span className="font-mono font-semibold">{params.code.toUpperCase()}</span>. Check the number and try again, or contact us.</p>
          <div className="mt-6 flex gap-3"><Link href="/certificates" className="btn-primary">Try again</Link><Link href="/contact" className="btn-secondary">Contact us</Link></div>
        </div>
      )}
    </Section>
  );
}
