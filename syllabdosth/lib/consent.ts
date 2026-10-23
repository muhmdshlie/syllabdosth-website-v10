/**
 * Cookie consent: the visitor's choice, stored in a first-party cookie the server can also read.
 * Necessary cookies (login, this one) are always on; analytics and marketing are opt-in.
 * Server and client safe.
 */

export const CONSENT_COOKIE = 'sd_consent';
export const VISITOR_COOKIE = 'sd_vid';
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // ask again after 6 months
export const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;
/** Fired on window to reopen the preferences dialog (footer link, cookie policy page). */
export const OPEN_PREFS_EVENT = 'sd:cookie-preferences';
/** Private areas and personal pages (someone's booking): never sent to any analytics. */
export const PRIVATE_PATH = /^\/(admin|dashboard|account|auth|api|bookings|forgot-password)(\/|$)/;

export type Consent = { analytics: boolean; marketing: boolean; at: number };

// "1.a1.m0.1761134400" → version 1, analytics on, marketing off, chosen at (unix seconds).
// Bumping the version asks everyone again.
export function parseConsent(raw?: string | null): Consent | null {
  const m = /^1\.a([01])\.m([01])\.(\d{1,12})$/.exec(raw ? decodeURIComponent(raw) : '');
  return m ? { analytics: m[1] === '1', marketing: m[2] === '1', at: Number(m[3]) } : null;
}

export function serializeConsent(c: Pick<Consent, 'analytics' | 'marketing'>): string {
  return `1.a${c.analytics ? 1 : 0}.m${c.marketing ? 1 : 0}.${Math.floor(Date.now() / 1000)}`;
}

/** Visitor cookie: random id + the India-time day it was first set, e.g. "3f2b….20261022". Not linked to any account. */
export function parseVisitor(raw?: string | null): { id: string; firstSeen: string } | null {
  const m = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(\d{8})$/.exec(raw ?? '');
  return m ? { id: m[1], firstSeen: `${m[2].slice(0, 4)}-${m[2].slice(4, 6)}-${m[2].slice(6)}` } : null;
}
