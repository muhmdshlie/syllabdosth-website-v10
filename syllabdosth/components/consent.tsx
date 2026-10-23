'use client';
/**
 * Cookie banner + preferences, and everything that may only run after consent:
 * first-party page-view and page-speed tracking (analytics) and, when switched on in Admin → Addon,
 * Google Analytics (analytics) and the Meta Pixel (marketing).
 */
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useReportWebVitals } from 'next/web-vitals';
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  CONSENT_COOKIE, CONSENT_MAX_AGE, OPEN_PREFS_EVENT, VISITOR_COOKIE, VISITOR_MAX_AGE, parseConsent, parseVisitor, publicPath, serializeConsent, type Consent,
} from '@/lib/consent';

type Choice = Pick<Consent, 'analytics' | 'marketing'>;

const readCookie = (name: string) => document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
const writeCookie = (name: string, value: string, maxAge: number) => {
  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
};
/** Deletes cookies on this host and the parent domain (where Google and Meta put theirs). */
function clearCookies(match: (name: string) => boolean) {
  const host = location.hostname;
  const domains = ['', host, `.${host}`, `.${host.replace(/^www\./, '')}`];
  for (const c of document.cookie.split('; ')) {
    const name = c.split('=')[0];
    if (name && match(name)) for (const d of domains) document.cookie = `${name}=; Path=/; Max-Age=0${d ? `; Domain=${d}` : ''}`;
  }
}

function uuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16)); // randomUUID needs https; this covers http on a local network
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function ensureVisitor() {
  if (parseVisitor(readCookie(VISITOR_COOKIE))) return;
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).replace(/-/g, '');
  writeCookie(VISITOR_COOKIE, `${uuid()}.${day}`, VISITOR_MAX_AGE);
}

export function ConsentManager({ ga, pixel }: { ga: string; pixel: string }) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState(false);

  useEffect(() => {
    setConsent(parseConsent(readCookie(CONSENT_COOKIE)));
    setReady(true);
    const open = () => setPrefs(true);
    window.addEventListener(OPEN_PREFS_EVENT, open);
    return () => window.removeEventListener(OPEN_PREFS_EVENT, open);
  }, []);

  const save = (next: Choice) => {
    const value = serializeConsent(next);
    writeCookie(CONSENT_COOKIE, value, CONSENT_MAX_AGE);
    if (!next.analytics) clearCookies((n) => n === VISITOR_COOKIE || n === '_gid' || n.startsWith('_ga'));
    if (!next.marketing) clearCookies((n) => n === '_fbp' || n === '_fbc');
    setPrefs(false);
    if (consent?.analytics && !next.analytics && ga) gtag('consent', 'update', { analytics_storage: 'denied' });
    // Google / Meta scripts can't be unloaded once running; a reload stops them.
    if ((consent?.analytics && !next.analytics && ga) || (consent?.marketing && !next.marketing && pixel)) {
      location.reload();
      return;
    }
    setConsent(parseConsent(value));
  };

  return (
    <>
      {ready && !consent && !prefs && <Banner marketing={!!pixel} onSave={save} onCustomize={() => setPrefs(true)} />}
      <Preferences open={prefs} consent={consent} ga={!!ga} marketing={!!pixel} onSave={save} onClose={() => setPrefs(false)} />
      {consent?.analytics && <Suspense fallback={null}><PageTracker /><SiteHealth /></Suspense>}
      {consent?.analytics && ga && <GoogleAnalytics id={ga} />}
      {consent?.marketing && pixel && <Script id="fb-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}</Script>}
    </>
  );
}

// btn-sm with tighter letter-spacing so "Reject optional cookies" fits on one line (banner and dialog).
const CHOICE_BTN = 'btn-sm whitespace-nowrap !px-3 !tracking-[0.12em]';

function Banner({ marketing, onSave, onCustomize }: { marketing: boolean; onSave: (c: Choice) => void; onCustomize: () => void }) {
  return (
    <div role="region" aria-labelledby="cookie-banner-title" data-testid="cookie-banner"
      className="fixed inset-x-3 bottom-3 z-[60] max-h-[calc(100vh-24px)] overflow-y-auto rounded-card border border-line bg-pearl p-5 text-ink shadow-[0_24px_60px_-20px_rgba(11,11,11,.45)] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[500px] sm:p-6">
      <p id="cookie-banner-title" className="eyebrow">Your privacy</p>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        We use essential cookies to keep the site working and you signed in. With your permission we’d also use analytics cookies to see which pages and courses help people most. We never sell your data.{' '}
        <Link href="/legal/cookies" className="font-medium text-ink underline underline-offset-2">Cookie policy</Link>
      </p>
      {/* Accept and reject get the same weight, so neither choice is pushed. */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" className={CHOICE_BTN + ' btn-primary'} onClick={() => onSave({ analytics: true, marketing })}>Accept all</button>
        <button type="button" className={CHOICE_BTN + ' btn-primary'} onClick={() => onSave({ analytics: false, marketing: false })}>Reject optional cookies</button>
        <button type="button" className={CHOICE_BTN + ' btn-secondary sm:col-span-2'} onClick={onCustomize}>Customize</button>
      </div>
    </div>
  );
}

function Preferences({ open, consent, ga, marketing, onSave, onClose }: {
  open: boolean; consent: Consent | null; ga: boolean; marketing: boolean; onSave: (c: Choice) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setAnalytics(!!consent?.analytics);
      setAds(!!consent?.marketing);
      d.showModal();
      d.querySelector<HTMLInputElement>('#ck-analytics')?.focus(); // first real choice, not the close button
    } else if (!open && d.open) d.close();
  }, [open, consent]);

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="cookie-prefs-title" data-lenis-prevent data-testid="cookie-preferences"
      className="w-[calc(100vw-32px)] max-w-[560px] rounded-card bg-pearl p-0 text-ink shadow-[0_30px_80px_-30px_rgba(11,11,11,.6)] backdrop:bg-noir/60">
      <form method="dialog" className="max-h-[calc(100vh-48px)] overflow-y-auto p-5 sm:p-7" onSubmit={(e) => { e.preventDefault(); onSave({ analytics, marketing: marketing && ads }); }}>
        <div className="flex items-start justify-between gap-4">
          <h2 id="cookie-prefs-title" className="font-display text-[22px] font-medium uppercase tracking-[-0.02em]">Cookie preferences</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 rounded-full p-2 text-[20px] leading-none text-ink-soft hover:text-ink">×</button>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          Choose which optional cookies we may use. You can change this any time from “Cookie settings” at the bottom of every page.
        </p>
        <ul className="mt-5 divide-y divide-line border-y border-line">
          <Toggle id="ck-necessary" title="Necessary" checked disabled>
            Keep you signed in and remember this choice. Always on.
          </Toggle>
          <Toggle id="ck-analytics" title="Analytics" checked={analytics} onChange={setAnalytics}>
            Count page views, course views and searches with a random ID that isn’t linked to your account, so we can improve the site. Kept for 13 months.
            {ga && ' Includes Google Analytics, which shares this data with Google.'}
          </Toggle>
          {marketing && (
            <Toggle id="ck-marketing" title="Marketing" checked={ads} onChange={setAds}>
              Lets Meta (Facebook and Instagram) measure our adverts. Data is shared with Meta.
            </Toggle>
          )}
        </ul>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button type="button" className={CHOICE_BTN + ' btn-secondary'} onClick={() => onSave({ analytics: false, marketing: false })}>Reject optional cookies</button>
          <button type="button" className={CHOICE_BTN + ' btn-secondary'} onClick={() => onSave({ analytics: true, marketing })}>Accept all</button>
          <button type="submit" className={CHOICE_BTN + ' btn-primary sm:col-span-2'}>Save choices</button>
        </div>
        <p className="mt-4 text-[12px] text-ink-soft"><Link href="/legal/cookies" className="underline underline-offset-2" onClick={onClose}>Read the cookie policy</Link></p>
      </form>
    </dialog>
  );
}

function Toggle({ id, title, checked, disabled, onChange, children }: {
  id: string; title: string; checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void; children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-4 py-4">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-[15px] font-semibold">{title}</label>
        <p id={`${id}-text`} className="mt-1 text-[13px] leading-relaxed text-ink-soft">{children}</p>
      </div>
      {/* A native checkbox (keyboard and screen readers work as usual), drawn as a switch. */}
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input id={id} type="checkbox" role="switch" aria-describedby={`${id}-text`} checked={checked} disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="peer h-6 w-11 cursor-pointer appearance-none rounded-full bg-[#CFCBC2] transition-colors checked:bg-noir focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-noir disabled:cursor-not-allowed disabled:opacity-50" />
        <span aria-hidden className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </li>
  );
}

/** "Cookie settings" link for the footer and the cookie policy page. */
export function CookieSettingsButton({ className = '', children = 'Cookie settings' }: { className?: string; children?: ReactNode }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_PREFS_EVENT))} data-testid="cookie-settings">{children}</button>;
}

// The referrer belongs to the first page of a page load only; later client-side navigations keep the same
// document.referrer, which would wrongly count every page as a new arrival.
let firstView = true;
let last = { key: '', at: 0 };

function PageTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    const u = search ? `${pathname}?${search}` : pathname;
    if (last.key === u && Date.now() - last.at < 1500) return; // React strict mode runs effects twice in development
    last = { key: u, at: Date.now() };
    ensureVisitor();
    const results = document.querySelector('[data-search-results]')?.getAttribute('data-search-results');
    const body: { u: string; t: boolean; n: number | null; r?: string } = { u, t: navigator.maxTouchPoints > 1, n: results == null ? null : Number(results) };
    if (firstView) {
      body.r = document.referrer;
      firstView = false;
    }
    beacon(body);
  }, [pathname, search]);
  return null;
}

const beacon = (body: object) => {
  fetch('/api/collect', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true, credentials: 'same-origin' }).catch(() => undefined);
};

// Page speed is measured for the page the browser loaded, not later client-side navigations.
const loadPath = typeof window === 'undefined' ? '' : location.pathname;
const reportVital = (m: { name: string; value: number }) => {
  if (!['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].includes(m.name)) return;
  const v = m.name === 'CLS' ? Math.round(m.value * 1000) / 1000 : Math.round(m.value); // CLS is a score, the rest are ms
  beacon({ k: 'vital', u: loadPath, m: m.name, v, t: navigator.maxTouchPoints > 1 });
};

/** Core Web Vitals (page speed) for the admin dashboard, only with analytics consent like the page views. */
function SiteHealth() {
  useReportWebVitals(reportVital);
  return null;
}

/** Counts an error page (path only, never the error message), only with analytics consent. For app/error.tsx. */
export function reportSiteError() {
  if (!parseConsent(readCookie(CONSENT_COOKIE))?.analytics) return;
  beacon({ k: 'error', u: location.pathname, t: navigator.maxTouchPoints > 1 });
}

// Google gets the page path only: no query string (except utm_ campaign tags), private pages hidden,
// certificate codes collapsed. Page views are sent here, not by Google's automatic tracking.
function gtag(..._args: unknown[]) {
  const w = window as unknown as { dataLayer?: unknown[] };
  // eslint-disable-next-line prefer-rest-params
  (w.dataLayer ||= []).push(arguments); // gtag.js expects the arguments object itself
}

let gaConfigured = false;
let gaLast = { key: '', at: 0 };

function GoogleAnalytics({ id }: { id: string }) {
  const pathname = usePathname();
  useEffect(() => {
    if (gaConfigured) return; // once per page load (strict mode runs effects twice in development)
    gaConfigured = true;
    gtag('js', new Date());
    gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  }, [id]);
  useEffect(() => {
    const clean = publicPath(pathname);
    const hidden = clean === null;
    const path = clean ?? '/private';
    const utm = new URLSearchParams([...new URLSearchParams(location.search)].filter(([k]) => k.startsWith('utm_'))).toString();
    const page = { page_location: `${location.origin}${path}${utm ? `?${utm}` : ''}`, page_title: hidden ? 'Private page' : document.title };
    gtag('set', page); // also used by Google's scroll and click events on this page
    if (hidden || (gaLast.key === path && Date.now() - gaLast.at < 1500)) return;
    gaLast = { key: path, at: Date.now() };
    gtag('event', 'page_view', page);
  }, [pathname, id]);
  return <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />;
}
