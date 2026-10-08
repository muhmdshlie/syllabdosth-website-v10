import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Section } from '@/components/ui';
import { getCourse } from '@/lib/data';

export default async function EnrollSent({ params }: { params: { slug: string } }) {
  const course = await getCourse(params.slug);
  if (!course) notFound();
  return (
    <Section>
      <div className="card mx-auto max-w-2xl text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-taupe text-2xl" aria-hidden>✓</span>
        <h1 className="h1 mt-6">Enrollment request sent</h1>
        <p className="body-l mt-3 text-ink-soft">Thanks! Our admissions team will call you within one working day about <strong className="text-ink">{course.title}</strong>. No payment has been taken.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">Go to my dashboard</Link>
          <Link href="/courses" className="btn-secondary">Browse more courses</Link>
        </div>
      </div>
    </Section>
  );
}
