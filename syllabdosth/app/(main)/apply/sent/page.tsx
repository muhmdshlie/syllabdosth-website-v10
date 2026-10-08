import Link from 'next/link';
import { Section } from '@/components/ui';

export default function ApplySent({ searchParams }: { searchParams: { type?: string } }) {
  const faculty = searchParams.type === 'faculty';
  return (
    <Section>
      <div className="card mx-auto max-w-2xl text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-taupe text-2xl" aria-hidden>✓</span>
        <h1 className="h1 mt-6">{faculty ? 'Faculty application received' : 'Registration received'}</h1>
        <p className="body-l mt-3 text-ink-soft">Our team reviews every application within 3 working days and will call you to discuss next steps.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="btn-primary">Create your account</Link>
          <Link href="/" className="btn-secondary">Go home</Link>
        </div>
      </div>
    </Section>
  );
}
