import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { browserFrom, classify, cleanPath, deviceFrom, isBot, recordEvent, recordHealth, sourceFrom } from '@/lib/analytics';
import { CONSENT_COOKIE, VISITOR_COOKIE, parseConsent, parseVisitor } from '@/lib/consent';
import { todayIST } from '@/lib/format';

/** Page-view, page-speed and error beacons from components/consent.tsx and app/error.tsx. Always answers 204 so it reveals nothing. */
export const dynamic = 'force-dynamic';

const Body = z.object({
  u: z.string().max(600), // location.pathname + location.search
  r: z.string().max(600).optional(), // document.referrer, sent with the first page of a page load only
  n: z.number().int().min(0).max(10000).nullable().optional(), // number of results on a course search
  t: z.boolean().optional(), // touch screen: tells iPads (which report a Mac) from Macs
});

// A page-speed measurement (Core Web Vitals) or an error on a page: the path and a number, nothing about the visitor.
const Health = z.object({
  k: z.enum(['vital', 'error']),
  u: z.string().max(600),
  m: z.enum(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']).optional(),
  v: z.number().min(0).max(600000).optional(),
  t: z.boolean().optional(),
});

const done = () => new NextResponse(null, { status: 204 });
const bare = (host: string) => host.toLowerCase().replace(/^www\./, '');
const hostOf = (u: string) => { try { return bare(new URL(u).hostname); } catch { return ''; } };

export async function POST(req: NextRequest) {
  // Same-site requests only (browsers set these headers; other sites can't fake them).
  const fetchSite = req.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') return done();
  const ownHost = bare(req.nextUrl.hostname);
  const origin = req.headers.get('origin');
  if (origin && hostOf(origin) !== ownHost) return done();

  // Consent is checked again here, so nothing is stored without it even if a page sends a beacon.
  if (!parseConsent(req.cookies.get(CONSENT_COOKIE)?.value)?.analytics) return done();
  const visitor = parseVisitor(req.cookies.get(VISITOR_COOKIE)?.value);
  const ua = req.headers.get('user-agent') ?? '';
  if (!visitor || isBot(ua)) return done();

  const text = await req.text();
  if (text.length > 2000) return done();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return done();
  }
  if (raw && typeof raw === 'object' && 'k' in raw) return health(raw, visitor.id, ua);

  let body: z.infer<typeof Body>;
  let url: URL;
  try {
    body = Body.parse(raw);
    url = new URL(body.u, 'http://localhost');
  } catch {
    return done();
  }
  const path = cleanPath(url.pathname);
  if (!path) return done();

  const { kind, course, term } = classify(path, url.searchParams.get('q'));
  // A visit starts when someone arrives from outside (or types the address), not when they move between our pages.
  const landing = body.r !== undefined && hostOf(body.r) !== ownHost;
  const q = url.searchParams;
  const from = landing ? sourceFrom(body.r ?? '', { source: q.get('utm_source'), medium: q.get('utm_medium'), campaign: q.get('utm_campaign') }, ownHost) : null;
  const day = todayIST();

  try {
    await recordEvent({
      day, visitor_id: visitor.id, is_returning: visitor.firstSeen < day, path, page_kind: kind, course_slug: course,
      search_term: term, search_results: kind === 'search' ? body.n ?? null : null,
      landing, source: from?.source ?? null, medium: from?.medium ?? null, campaign: from?.campaign ?? null, device: deviceFrom(ua, !!body.t), browser: browserFrom(ua),
    });
  } catch {
    // Analytics must never break the website (e.g. before the migration has run).
  }
  return done();
}

async function health(raw: object, visitor: string, ua: string) {
  const h = Health.safeParse(raw);
  if (!h.success || (h.data.k === 'vital' && (!h.data.m || h.data.v === undefined))) return done();
  let path: string | null = null;
  try { path = cleanPath(new URL(h.data.u, 'http://localhost').pathname); } catch { /* not a path */ }
  if (!path) return done();
  try {
    await recordHealth({
      day: todayIST(), path, metric: h.data.k === 'error' ? 'error' : h.data.m!, value: h.data.k === 'error' ? 0 : h.data.v!, device: deviceFrom(ua, !!h.data.t),
    }, visitor);
  } catch {
    // Same as above: never break the website, e.g. before the site_vitals table exists.
  }
  return done();
}
