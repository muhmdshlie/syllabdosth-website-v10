import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginPanel } from '@/components/auth-forms';
import { DemoLogin } from '@/components/demo-login';
import { Section } from '@/components/ui';
import { isDemo } from '@/lib/config';

export const metadata: Metadata = { title: 'Create account' };

export default function SignupPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next?.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : '';
  return (
    <Section>
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
        <div className="card">
          <h1 className="h1">Create your account</h1>
          <p className="mt-2 text-ink-soft">Free. Takes under a minute.</p>
          <div className="mt-8"><LoginPanel next={next} mode="signup" /></div>
          <p className="mt-6 text-center text-[14px]">Already have an account? <Link href="/login" className="font-semibold underline">Log in</Link></p>
          <p className="mt-3 text-center text-[12px] text-ink-soft">By continuing you agree to our <Link href="/legal/terms" className="underline">Terms</Link> and <Link href="/legal/privacy" className="underline">Privacy policy</Link>.</p>
        </div>
        <div className="space-y-6">
          {isDemo && <DemoLogin next={next} />}
          <div className="card">
            <p className="font-semibold">Want to teach or take bookings?</p>
            <p className="mt-1 text-[14px] text-ink-soft">Everyone starts as a learner. Apply as <Link href="/apply/faculty" className="font-semibold underline">faculty</Link> or <Link href="/apply/professional" className="font-semibold underline">professional</Link> and our team upgrades your account once approved.</p>
          </div>
        </div>
      </div>
    </Section>
  );
}
