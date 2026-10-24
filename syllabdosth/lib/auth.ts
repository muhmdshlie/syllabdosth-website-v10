import 'server-only';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { demoAuth, isDemo } from './config';
import { table } from './store';
import { createAdminClient, createClient } from './supabase/server';
import type { Profile, Role } from './types';

export type CurrentUser = { id: string; email: string | null; profile: Profile };

export const DEMO_ROLE_COOKIE = 'sd_demo_role';

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (isDemo) {
    if (!demoAuth) return null;
    const role = cookies().get(DEMO_ROLE_COOKIE)?.value as Role | undefined;
    if (!role || !['learner', 'professional', 'faculty', 'franchise', 'admin'].includes(role)) return null;
    const profile = table<Profile>('profiles').find((p) => p.id === `demo-${role}`);
    if (!profile || profile.status === 'blocked') return null;
    return { id: profile.id, email: profile.email, profile };
  }
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  if ((profile as Profile | null)?.status === 'blocked') return null; // blocked from Admin → Students / Users
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    profile: (profile as Profile) ?? {
      id: data.user.id,
      full_name: (data.user.user_metadata?.full_name as string) ?? '',
      email: data.user.email ?? null,
      phone: data.user.phone ?? null,
      role: 'learner',
    },
  };
}

/** Redirects to /login (or the right dashboard) unless the user has one of the roles. */
export async function requireRole(roles: Role[], next = '/dashboard'): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!roles.includes(user.profile.role)) redirect(dashboardPathFor(user.profile.role));
  return user;
}

/**
 * Every admin page calls this itself. The admin layout's check is not enough: with partial rendering a
 * client navigation can render a page without re-running the layout above it.
 */
export function requireAdmin(next = '/admin'): Promise<CurrentUser> {
  return requireRole(['admin'], next);
}

/**
 * Booking pages: a booking made from an account is shown only to that account or an admin (others are sent
 * to log in, or get "not found"). A guest booking has no account, so its private link is the only key.
 */
export async function requireBookingViewer(customerId: string | null, path: string): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!customerId || user?.id === customerId || user?.profile.role === 'admin') return user;
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  notFound();
}

export async function requireUser(next = '/dashboard'): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export function dashboardPathFor(role: Role) {
  return role === 'admin'
    ? '/admin'
    : role === 'professional'
      ? '/dashboard/pro'
      : role === 'faculty'
        ? '/dashboard/faculty'
        : role === 'franchise'
          ? '/dashboard/franchise'
          : '/dashboard';
}