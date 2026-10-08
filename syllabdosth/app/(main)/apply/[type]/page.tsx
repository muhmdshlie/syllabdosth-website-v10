import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { applyAction } from '@/app/actions';
import { ActionForm, Field, SubmitButton, TextArea } from '@/components/forms';
import { Check, PageHeader, Section } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth';

const copy = {
  faculty: {
    title: 'Apply as faculty',
    sub: 'Teach a course you already practise professionally. We handle batches, marketing, certificates and payments.',
    perks: ['Earn per batch you teach', 'Online or at a centre near you', 'Curriculum and certificate support', 'Keep taking your own client work'],
    skillLabel: 'What would you teach?',
    cta: 'Send faculty application',
  },
  professional: {
    title: 'Register as a professional',
    sub: 'Get booking requests from customers near you. Syllabdosth graduates and experienced artists are welcome.',
    perks: ['Verified badge on your profile', 'Booking requests straight to your dashboard', 'Accept only the jobs you want', 'No listing fee during launch'],
    skillLabel: 'Your main service',
    cta: 'Send registration',
  },
} as const;

export function generateMetadata({ params }: { params: { type: string } }): Metadata {
  const c = copy[params.type as keyof typeof copy];
  return c ? { title: c.title } : {};
}

export default async function ApplyPage({ params }: { params: { type: string } }) {
  const c = copy[params.type as keyof typeof copy];
  if (!c) notFound();
  const user = await getCurrentUser();
  return (
    <Section>
      <PageHeader crumbs={[{ href: '/', label: 'Home' }, { label: c.title }]} title={c.title} sub={c.sub} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="card">
          <ActionForm action={applyAction} className="grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="type" value={params.type} />
            <Field label="Full name" name="name" required autoComplete="name" defaultValue={user?.profile.full_name} />
            <Field label="Phone number" name="phone" type="tel" required autoComplete="tel" defaultValue={user?.profile.phone ?? ''} />
            <Field label="Email" name="email" type="email" required autoComplete="email" defaultValue={user?.email ?? ''} />
            <Field label="City" name="city" required autoComplete="address-level2" placeholder="e.g. Bengaluru" />
            <Field label={c.skillLabel} name="skill" required placeholder="e.g. Bridal mehandi" />
            <Field label="Years of experience" name="experience_years" type="number" min={0} required inputMode="numeric" />
            <TextArea label="Tell us about your work" name="message" rows={5} placeholder="Certifications, where you work, Instagram/portfolio link…" className="sm:col-span-2" />
            <div className="sm:col-span-2"><SubmitButton className="w-full">{c.cta}</SubmitButton></div>
          </ActionForm>
        </div>
        <aside className="card h-fit">
          <h2 className="h3">Why join</h2>
          <ul className="mt-4 space-y-3">{c.perks.map((p) => <li key={p} className="flex gap-2"><span className="text-taupe-deep"><Check /></span>{p}</li>)}</ul>
          <p className="mt-6 text-[14px] text-ink-soft">Franchise or training-partner enquiry? Mention it in the message and our partnerships team will call you.</p>
        </aside>
      </div>
    </Section>
  );
}
