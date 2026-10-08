'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { ActionState } from '@/lib/action-state';
import { DEMO_ROLE_COOKIE, dashboardPathFor, getCurrentUser } from '@/lib/auth';
import { SITE_URL, isDemo } from '@/lib/config';
import { createClient } from '@/lib/supabase/server';
import type { Role } from '@/lib/types';

/** Only allow same-site relative redirects. */
function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === 'string' ? v : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : '';
}
async function goAfterLogin(next: string) {
  if (next) redirect(next);
  const user = await getCurrentUser();
  redirect(user ? dashboardPathFor(user.profile.role) : '/dashboard');
}
const demoMsg = { error: 'Demo mode: use the “Try a demo account” buttons below. Real login works once Supabase keys are added.' };

/* ------------------------------- Email ------------------------------- */
const creds = z.object({ email: z.string().trim().email('Enter a valid email'), password: z.string().min(8, 'Password must be at least 8 characters') });

export async function signInEmail(_: ActionState, fd: FormData): Promise<ActionState> {
  if (isDemo) return demoMsg;
  const p = creds.safeParse({ email: fd.get('email'), password: fd.get('password') });
  if (!p.success) return { error: p.error.issues[0].message };
  const { error } = await createClient().auth.signInWithPassword(p.data);
  if (error) return { error: error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message };
  await goAfterLogin(safeNext(fd.get('next')));
  return {};
}

export async function signUpEmail(_: ActionState, fd: FormData): Promise<ActionState> {
  if (isDemo) return demoMsg;
  const p = creds.extend({ full_name: z.string().trim().min(2, 'Enter your name') }).safeParse({
    email: fd.get('email'), password: fd.get('password'), full_name: fd.get('full_name'),
  });
  if (!p.success) return { error: p.error.issues[0].message };
  const { data, error } = await createClient().auth.signUp({
    email: p.data.email,
    password: p.data.password,
    options: { data: { full_name: p.data.full_name }, emailRedirectTo: `${SITE_URL}/auth/callback?next=/dashboard` },
  });
  if (error) return { error: error.message };
  if (data.session) await goAfterLogin(safeNext(fd.get('next')));
  return { ok: true, message: `Check ${p.data.email} for a confirmation link to finish creating your account.` };
}

export async function forgotPassword(_: ActionState, fd: FormData): Promise<ActionState> {
  if (isDemo) return demoMsg;
  const email = z.string().trim().email('Enter a valid email').safeParse(fd.get('email'));
  if (!email.success) return { error: email.error.issues[0].message };
  await createClient().auth.resetPasswordForEmail(email.data, { redirectTo: `${SITE_URL}/auth/callback?next=/account/reset-password` });
  return { ok: true, message: 'If that email has an account, a reset link is on its way.' };
}

export async function updatePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  if (isDemo) return demoMsg;
  const pw = z.string().min(8, 'Password must be at least 8 characters').safeParse(fd.get('password'));
  if (!pw.success) return { error: pw.error.issues[0].message };
  if (fd.get('password') !== fd.get('confirm')) return { error: 'Passwords do not match.' };
  const { error } = await createClient().auth.updateUser({ password: pw.data });
  if (error) return { error: error.message };
  return { ok: true, message: 'Password updated.' };
}

/* ------------------------------- Google ------------------------------- */
export async function signInGoogle(fd: FormData) {
  if (isDemo) redirect('/login?demo=1');
  const next = safeNext(fd.get('next')) || '/dashboard';
  const { data, error } = await createClient().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect('/login?error=google');
  redirect(data.url);
}

/* ------------------------------ Phone OTP ------------------------------ */
function normalisePhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(ten) ? `+91${ten}` : null;
}

export async function sendPhoneOtp(_: ActionState, fd: FormData): Promise<ActionState> {
  if (isDemo) return demoMsg;
  const phone = normalisePhone(String(fd.get('phone') ?? ''));
  if (!phone) return { error: 'Enter a valid 10-digit Indian mobile number.' };
  const { error } = await createClient().auth.signInWithOtp({ phone });
  if (error) return { error: error.message };
  return { ok: true, message: `We sent a 6-digit code to ${phone}.`, fields: { phone } };
}

export async function verifyPhoneOtp(_: ActionState, fd: FormData): Promise<ActionState> {
  if (isDemo) return demoMsg;
  const phone = String(fd.get('phone') ?? '');
  const token = String(fd.get('token') ?? '').replace(/\D/g, '');
  if (token.length !== 6) return { error: 'Enter the 6-digit code.', ok: true, fields: { phone } };
  const { error } = await createClient().auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) return { error: 'That code is wrong or has expired.', ok: true, fields: { phone } };
  await goAfterLogin(safeNext(fd.get('next')));
  return {};
}

/* ------------------------------- Session ------------------------------- */
export async function signOut() {
  if (isDemo) cookies().delete(DEMO_ROLE_COOKIE);
  else await createClient().auth.signOut();
  redirect('/');
}

export async function demoLogin(fd: FormData) {
  if (!isDemo) redirect('/login');
  const role = String(fd.get('role')) as Role;
  if (!['learner', 'professional', 'faculty', 'admin'].includes(role)) redirect('/login');
  cookies().set(DEMO_ROLE_COOKIE, role, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8 });
  redirect(safeNext(fd.get('next')) || dashboardPathFor(role));
}
