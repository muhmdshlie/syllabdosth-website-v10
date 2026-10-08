'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useFormState } from 'react-dom';
import { sendPhoneOtp, signInEmail, signInGoogle, signUpEmail, verifyPhoneOtp } from '@/app/auth-actions';
import type { ActionState } from '@/lib/action-state';
import { ActionForm, Field, SubmitButton } from './forms';

export function LoginPanel({ next, mode }: { next: string; mode: 'login' | 'signup' }) {
  const [tab, setTab] = useState<'email' | 'phone'>('email');
  return (
    <div>
      <GoogleButton next={next} />
      <div className="my-6 flex items-center gap-3 text-[13px] text-ink-soft"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
      <div role="tablist" className="mb-6 grid grid-cols-2 rounded-full bg-muted p-1">
        {(['email', 'phone'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} className={`rounded-full py-2.5 text-[14px] font-semibold ${tab === t ? 'bg-white shadow-sm' : 'text-ink-soft'}`}>
            {t === 'email' ? 'Email' : 'Phone OTP'}
          </button>
        ))}
      </div>
      {tab === 'email' ? (mode === 'login' ? <EmailLogin next={next} /> : <EmailSignup next={next} />) : <PhoneOtp next={next} />}
    </div>
  );
}

function GoogleButton({ next }: { next: string }) {
  return (
    <form action={signInGoogle}>
      <input type="hidden" name="next" value={next} />
      <button type="submit" className="btn-secondary w-full">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continue with Google
      </button>
    </form>
  );
}

function EmailLogin({ next }: { next: string }) {
  return (
    <ActionForm action={signInEmail} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field label="Password" name="password" type="password" required autoComplete="current-password" />
      <div className="text-right text-[14px]"><Link href="/forgot-password" className="font-semibold underline">Forgot password?</Link></div>
      <SubmitButton className="w-full" pendingText="Logging in…">Log in</SubmitButton>
    </ActionForm>
  );
}

function EmailSignup({ next }: { next: string }) {
  return (
    <ActionForm action={signUpEmail} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <Field label="Full name" name="full_name" required autoComplete="name" />
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field label="Password" name="password" type="password" required autoComplete="new-password" hint="At least 8 characters" />
      <SubmitButton className="w-full" pendingText="Creating account…">Create account</SubmitButton>
    </ActionForm>
  );
}

function PhoneOtp({ next }: { next: string }) {
  const [sent, send] = useFormState(sendPhoneOtp, {} as ActionState);
  const [verified, verify] = useFormState(verifyPhoneOtp, {} as ActionState);
  const phone = verified.fields?.phone ?? sent.fields?.phone;
  if (sent.ok && phone) {
    return (
      <form action={verify} className="space-y-5">
        <p className="rounded-xl bg-soft px-4 py-3 text-[14px]">{sent.message}</p>
        {verified.error && <p role="alert" className="rounded-xl bg-[#FDE7E4] px-4 py-3 text-[14px] text-[#8A1F11]">{verified.error}</p>}
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="next" value={next} />
        <Field label="6-digit code" name="token" required inputMode="numeric" autoComplete="one-time-code" />
        <SubmitButton className="w-full" pendingText="Verifying…">Verify &amp; continue</SubmitButton>
      </form>
    );
  }
  return (
    <form action={send} className="space-y-5">
      {sent.error && <p role="alert" className="rounded-xl bg-[#FDE7E4] px-4 py-3 text-[14px] text-[#8A1F11]">{sent.error}</p>}
      <Field label="Mobile number" name="phone" type="tel" required autoComplete="tel" placeholder="98xxx xxxxx" hint="We’ll text you a one-time code. New numbers get an account automatically." />
      <SubmitButton className="w-full" pendingText="Sending code…">Send code</SubmitButton>
    </form>
  );
}
