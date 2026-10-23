import 'server-only';
/**
 * First-party website analytics (Admin → Reports → Website Analytics).
 * Only recorded after the visitor accepts analytics cookies. One row per page view, holding a random
 * visitor id (never the account), a cleaned path, the device type and, for the first page of a visit,
 * where the visitor came from. No IP address, user agent, names, emails or form contents are stored.
 */
import { isDemo } from './config';
import { PRIVATE_PATH as PRIVATE } from './consent';
import { todayIST } from './format';
import { newId, table } from './store';
import { createAdminClient } from './supabase/server';

export type PageKind = 'page' | 'course' | 'enroll' | 'enroll_sent' | 'search';
export type Device = 'mobile' | 'tablet' | 'desktop';
export type Medium = 'direct' | 'search' | 'social' | 'referral' | 'campaign' | 'email';

export type AnalyticsEvent = {
  day: string; visitor_id: string; is_returning: boolean; path: string; page_kind: PageKind; course_slug: string | null;
  search_term: string | null; search_results: number | null; landing: boolean; source: string | null; medium: Medium | null; device: Device;
};

const SAFE_PATH = /^\/[A-Za-z0-9\-._/[\]]*$/;

/** Path without query string, or null when it must not be recorded. Codes in URLs are collapsed. */
export function cleanPath(pathname: string): string | null {
  let p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (!p.startsWith('/') || p.length > 200 || !SAFE_PATH.test(p) || PRIVATE.test(p)) return null;
  p = p.replace(/^\/certificates\/[^/]+/, '/certificates/[code]');
  return p;
}

/** Search words as typed, minus anything that looks like contact details. Null → counted but not shown. */
export function cleanTerm(q: string): string | null {
  const t = q.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!t || /@/.test(t) || /\d{5,}/.test(t.replace(/[\s\-+().]/g, ''))) return null;
  return t;
}

export function classify(path: string, q: string | null): { kind: PageKind; course: string | null; term: string | null } {
  if (path === '/courses' && q?.trim()) return { kind: 'search', course: null, term: cleanTerm(q) };
  const m = /^\/courses\/([a-z0-9-]{1,120})(\/enroll(\/sent)?)?$/.exec(path);
  if (m) return { kind: m[3] ? 'enroll_sent' : m[2] ? 'enroll' : 'course', course: m[1], term: null };
  return { kind: 'page', course: null, term: null };
}

export function deviceFrom(ua: string, touch: boolean): Device {
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (/Macintosh/i.test(ua) && touch)) return 'tablet';
  if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

export const isBot = (ua: string) => !ua || /bot|crawl|spider|slurp|headless|lighthouse|pingdom|preview|externalhit|curl|wget|python|axios|node-fetch|go-http/i.test(ua);

const SEARCH_ENGINES = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia|startpage)\./;
const SOCIAL = /(^|\.)(facebook\.com|fb\.com|instagram\.com|t\.co|twitter\.com|x\.com|linkedin\.com|lnkd\.in|youtube\.com|youtu\.be|whatsapp\.com|wa\.me|pinterest\.com|pin\.it|reddit\.com|threads\.net|t\.me|telegram\.org)$/;

/** Where a visit came from: UTM tags first, then the referring site's domain (never the full URL). */
export function sourceFrom(referrer: string, utm: { source?: string | null; medium?: string | null }, ownHost: string): { source: string; medium: Medium } {
  const tag = (utm.source ?? '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40);
  if (tag) return { source: tag, medium: /^e-?mail|newsletter$/i.test(utm.medium ?? '') ? 'email' : 'campaign' };
  let host = '';
  try { host = referrer ? new URL(referrer).hostname.toLowerCase().replace(/^www\./, '') : ''; } catch { /* not a URL */ }
  if (!host || host === ownHost.replace(/^www\./, '')) return { source: 'direct', medium: 'direct' };
  return { source: host.slice(0, 80), medium: SEARCH_ENGINES.test(host) ? 'search' : SOCIAL.test(host) ? 'social' : 'referral' };
}

// A visitor can send at most this many page views a minute (per server instance), against scripted spam.
const throttle = new Map<string, { n: number; until: number }>();
function allowed(visitor: string) {
  const now = Date.now();
  const t = throttle.get(visitor);
  if (!t || t.until < now) {
    if (throttle.size > 5000) throttle.clear();
    throttle.set(visitor, { n: 1, until: now + 60_000 });
    return true;
  }
  return ++t.n <= 60;
}

export async function recordEvent(e: AnalyticsEvent): Promise<void> {
  if (!allowed(e.visitor_id)) return;
  if (isDemo) {
    table<AnalyticsEvent & { id: string; created_at: string }>('analytics_events').push({ ...e, id: newId('an'), created_at: new Date().toISOString() });
    return;
  }
  const db = createAdminClient();
  purgeDaily(db);
  const { error } = await db.from('analytics_events').insert(e);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ dashboard */

export type AnalyticsSummary = {
  totals: { views: number; visitors: number; returning: number; visits: number; courseViews: number; searches: number };
  daily: { day: string; views: number; visitors: number }[];
  pages: { path: string; views: number; visitors: number }[];
  courses: { slug: string; views: number; starts: number; sent: number }[];
  sources: { source: string; medium: Medium; visits: number }[];
  devices: { device: Device; visitors: number; views: number }[];
  searches: { term: string; count: number; zero: number }[];
  funnel: { viewed: number; started: number; sent: number };
};

export type AnalyticsResult = { ok: true; data: AnalyticsSummary } | { ok: false; missing: boolean; message: string };

// Search words are listed only when this many searches used them, so a one-off entry can't single anyone out.
export const MIN_TERM_COUNT = 2;
const KEEP_DAYS = 395; // about 13 months, as promised in the privacy and cookie policies
let lastPurge = '';

/** Deletes old events at most once a day per server instance; runs on normal traffic so it never depends on an admin visit. */
function purgeDaily(db: ReturnType<typeof createAdminClient>) {
  const today = todayIST();
  if (lastPurge === today) return;
  lastPurge = today;
  void db.rpc('analytics_purge', { p_keep_days: KEEP_DAYS }).then(() => undefined, () => undefined);
}

/** Aggregated numbers for a date range (India-time days, inclusive). Callers must have checked the admin role. */
export async function siteAnalytics(from: string, to: string): Promise<AnalyticsResult> {
  if (isDemo) return { ok: true, data: summarize(table<AnalyticsEvent>('analytics_events'), from, to) };
  const db = createAdminClient();
  purgeDaily(db);
  const { data, error } = await db.rpc('analytics_summary', { p_from: from, p_to: to, p_min_term: MIN_TERM_COUNT });
  if (error) {
    const missing = ['42883', '42P01', 'PGRST202', 'PGRST205'].includes(error.code ?? '');
    return { ok: false, missing, message: error.message };
  }
  return { ok: true, data: data as AnalyticsSummary };
}

/** Same numbers as the analytics_summary() SQL function, for demo mode. */
export function summarize(all: AnalyticsEvent[], from: string, to: string): AnalyticsSummary {
  const rows = all.filter((r) => r.day >= from && r.day <= to);
  const distinct = (list: AnalyticsEvent[]) => new Set(list.map((r) => r.visitor_id)).size;
  const group = <K extends string>(list: AnalyticsEvent[], key: (r: AnalyticsEvent) => K | null) => {
    const m = new Map<K, AnalyticsEvent[]>();
    for (const r of list) { const k = key(r); if (k !== null) m.set(k, [...(m.get(k) ?? []), r]); }
    return Array.from(m.entries());
  };
  const of = (kind: PageKind) => rows.filter((r) => r.page_kind === kind);
  const byDesc = <T>(n: (x: T) => number, s: (x: T) => string) => (a: T, b: T) => n(b) - n(a) || s(a).localeCompare(s(b));
  return {
    totals: {
      views: rows.length, visitors: distinct(rows), returning: distinct(rows.filter((r) => r.is_returning)),
      visits: rows.filter((r) => r.landing).length, courseViews: of('course').length, searches: of('search').length,
    },
    daily: group(rows, (r) => r.day).map(([day, l]) => ({ day, views: l.length, visitors: distinct(l) })).sort((a, b) => a.day.localeCompare(b.day)),
    pages: group(rows, (r) => r.path).map(([path, l]) => ({ path, views: l.length, visitors: distinct(l) })).sort(byDesc((x) => x.views, (x) => x.path)).slice(0, 15),
    courses: group(rows, (r) => r.course_slug).map(([slug, l]) => ({
      slug, views: l.filter((r) => r.page_kind === 'course').length, starts: l.filter((r) => r.page_kind === 'enroll').length, sent: l.filter((r) => r.page_kind === 'enroll_sent').length,
    })).sort(byDesc((x) => x.views, (x) => x.slug)).slice(0, 15),
    sources: group(rows.filter((r) => r.landing), (r) => `${r.source ?? 'direct'}|${r.medium ?? 'direct'}`).map(([k, l]) => {
      const [source, medium] = k.split('|');
      return { source, medium: medium as Medium, visits: l.length };
    }).sort(byDesc((x) => x.visits, (x) => x.source)).slice(0, 12),
    devices: group(rows, (r) => r.device).map(([device, l]) => ({ device, visitors: distinct(l), views: l.length })).sort(byDesc((x) => x.visitors, (x) => x.device)),
    searches: group(of('search'), (r) => r.search_term).filter(([, l]) => l.length >= MIN_TERM_COUNT)
      .map(([term, l]) => ({ term, count: l.length, zero: l.filter((r) => r.search_results === 0).length })).sort(byDesc((x) => x.count, (x) => x.term)).slice(0, 20),
    funnel: { viewed: distinct(of('course')), started: distinct(of('enroll')), sent: distinct(of('enroll_sent')) },
  };
}
