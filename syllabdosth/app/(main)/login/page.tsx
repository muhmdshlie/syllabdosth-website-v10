import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginPanel } from '@/components/auth-forms';
import { DemoLogin } from '@/components/demo-login';
import { Section } from '@/components/ui';
import { dashboardPathFor, getCurrentUser } from '@/lib/auth';
import { isDemo } from '@/lib/config';

export const metadata: Metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = searchParams.next?.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : '';
  const user = await getCurrentUser();
  if (user) redirect(next || dashboardPathFor(user.profile.role));
  return (
    <Section>
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="card">
          <h1 className="h1">Welcome back</h1>
          <p className="mt-2 text-ink-soft">Log in to track bookings, courses and requests.</p>
          {searchParams.error && <p role="alert" className="mt-4 rounded-xl bg-[#FDE7E4] px-4 py-3 text-[14px] text-[#8A1F11]">That sign-in didn’t work. Please try again.</p>}
          <div className="mt-8"><LoginPanel next={next} mode="login" /></div>
          <p className="mt-6 text-center text-[14px]">New to Syllabdosth? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold underline">Create an account</Link></p>
        </div>
        <div className="space-y-6">
          {isDemo && <DemoLogin next={next} />}
          <div className="rounded-card bg-noir p-8 text-white">
            <p className="font-serif text-[26px] font-bold leading-tight">Learn a craft.<br />Book a master.</p>
            <p className="mt-3 text-ink-dark-muted">One account for everything — courses, bookings, and your professional or faculty profile.</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
