import Link from 'next/link';
import { Section } from '@/components/ui';

export default function GroupSent() {
  return (
    <Section>
      <div className="card mx-auto max-w-2xl text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-taupe text-2xl" aria-hidden>✓</span>
        <h1 className="h1 mt-6">Group enquiry sent</h1>
        <p className="body-l mt-3 text-ink-soft">Thanks! Our team will call you within one working day with availability and pricing. No payment has been taken.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/services" className="btn-primary">Back to services</Link>
          <Link href="/" className="btn-secondary">Go home</Link>
        </div>
      </div>
    </Section>
  );
}
