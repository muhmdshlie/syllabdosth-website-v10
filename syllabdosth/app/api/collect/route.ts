import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { classify, cleanPath, deviceFrom, isBot, recordEvent, sourceFrom } from '@/lib/analytics';
import { CONSENT_COOKIE, VISITOR_COOKIE, parseConsent, parseVisitor } from '@/lib/consent';
import { todayIST } from '@/lib/format';

/** Page-view beacon from components/consent.tsx. Always answers 204 so it reveals nothing. */
export const dynamic = 'force-dynamic';

const Body = z.object({
  u: z.string().max(600), // location.pathname + location.search
  r: z.string().max(600).optional(), // document.referrer, sent with the first page of a page load only
  n: z.number().int().min(0).max(10000).nullable().optional(), // number of results on a course search
  t: z.boolean().optional(), // touch screen: tells iPads (which report a Mac) from Macs
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
  let body: z.infer<typeof Body>;
  let url: URL;
  try {
    body = Body.parse(JSON.parse(text));
    url = new URL(body.u, 'http://localhost');
  } catch {
    return done();
  }
  const path = cleanPath(url.pathname);
  if (!path) return done();

  const { kind, course, term } = classify(path, url.searchParams.get('q'));
  // A visit starts when someone arrives from outside (or types the address), not when they move between our pages.
  const landing = body.r !== undefined && hostOf(body.r) !== ownHost;
  const from = landing ? sourceFrom(body.r ?? '', { source: url.searchParams.get('utm_source'), medium: url.searchParams.get('utm_medium') }, ownHost) : null;
  const day = todayIST();

  try {
    await recordEvent({
      day, visitor_id: visitor.id, is_returning: visitor.firstSeen < day, path, page_kind: kind, course_slug: course,
      search_term: term, search_results: kind === 'search' ? body.n ?? null : null,
      landing, source: from?.source ?? null, medium: from?.medium ?? null, device: deviceFrom(ua, !!body.t),
    });
  } catch {
    // Analytics must never break the website (e.g. before the migration has run).
  }
  return done();
}
