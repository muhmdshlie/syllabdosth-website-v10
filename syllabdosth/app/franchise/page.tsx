import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer, Nav } from '@/components/site';
import { MaintenanceGate, SiteExtras } from '@/components/site-extras';
import { Arrow, PageHeader, Section, SectionHeader } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Franchise',
  description: 'Become a Syllabdosth franchise partner and start your own learning centre.',
};

const steps = [
  {
    title: 'Share your details',
    text: 'Tell us your name, contact details, preferred city or district, and your investment budget.',
  },
  {
    title: 'We review your enquiry',
    text: 'Our team looks at your enquiry and gets in touch with you.',
  },
  {
    title: 'Talk through the opportunity',
    text: 'We discuss franchise opportunities and investment requirements, so you can decide with the full picture.',
  },
];

/* Same wrapper as app/(main) so the header and footer match the rest of the site. */
export default function FranchisePage() {
  return (
    <MaintenanceGate>
      <Nav />
      <main id="main" className="min-h-[60vh]">
        <Section>
          <PageHeader
            crumbs={[{ href: '/', label: 'Home' }, { label: 'Franchise' }]}
            title="Start your own learning centre"
            sub="Become a Syllabdosth franchise partner. Share your details, preferred location and investment plans, and we'll take it from there."
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/franchise/apply" className="btn-primary">
              Apply for Franchise <Arrow />
            </Link>
            <Link href="/contact" className="btn-secondary">
              Ask a question
            </Link>
          </div>
        </Section>

        <Section tone="cream">
          <SectionHeader
            eyebrow="How it works"
            title="Three simple steps"
            sub="Applying takes a few minutes. Nothing is committed until we've talked it through."
          />
          <ol className="grid gap-5 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="card !p-7">
                <p className="font-serif text-[36px] font-bold leading-none">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="h3 mt-5">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{step.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section tone="dark">
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow text-taupe">Franchise enquiry</p>
              <h2 className="h1 mt-3 text-white">Ready to apply?</h2>
              <p className="body-l mt-3 text-ink-dark-muted">
                The application takes a few minutes. Our team will review it and contact you to discuss the next steps.
              </p>
            </div>
            <Link href="/franchise/apply" className="btn-primary bg-pearl text-noir hover:bg-white">
              Apply for Franchise <Arrow />
            </Link>
          </div>
        </Section>
      </main>
      <Footer />
      <SiteExtras />
    </MaintenanceGate>
  );
}
