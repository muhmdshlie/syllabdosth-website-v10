import Link from 'next/link';
import { dashboardPathFor, getCurrentUser } from '@/lib/auth';
import { getContent, getSiteSettings, type SiteSettings } from '@/lib/cms/content';
import { isDemo } from '@/lib/config';
import { MobileMenuCloser } from './motion';

export function Logo({ dark, className = 'h-9 sm:h-10', site }: { dark?: boolean; className?: string; site: SiteSettings }) {
  // Logos are set in Admin > Website Settings > Logo & branding (defaults: /public/logo-noir.png and /public/logo-white.png).
  return (
    <Link href="/" className="group inline-flex items-center" aria-label={`${site.siteName} home`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dark ? site.logoLight : site.logoDark}
        alt={site.siteName}
        width={853}
        height={208}
        className={`${className} w-auto transition duration-300 group-hover:scale-[1.03]`}
      />
    </Link>
  );
}

const links = [
  { href: '/courses', label: 'Courses' },
  { href: '/services', label: 'Services' },
  { href: '/group-booking', label: 'Group bookings' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
];

type Announcement = { enabled: boolean; text: string; linkLabel: string; linkUrl: string };

export async function Nav({ dark = false }: { dark?: boolean }) {
  const [user, site, bar] = await Promise.all([getCurrentUser(), getSiteSettings(), getContent<Announcement>('settings.announcement')]);
  const text = dark ? 'text-pearl' : 'text-ink';
  const account = user ? (
    <Link href={dashboardPathFor(user.profile.role)} className={`nav-link ${text}`}>Dashboard</Link>
  ) : (
    <Link href="/login" className={`nav-link ${text}`}>Log in</Link>
  );
  return (
    <header className={dark ? 'absolute inset-x-0 top-0 z-40' : 'sticky top-0 z-40'}>
      {isDemo && <DemoBanner />}
      {bar.enabled && bar.text && (
        <div className="bg-noir px-4 py-2 text-center text-[12px] font-medium tracking-wide text-pearl" data-testid="announcement">
          {bar.text}
          {bar.linkUrl && <Link href={bar.linkUrl} className="ml-2 underline underline-offset-2">{bar.linkLabel || 'Learn more'}</Link>}
        </div>
      )}
      <div className="container-page pt-4">
        <div className={`flex h-[60px] items-center justify-between gap-6 rounded-[10px] pl-5 pr-2 ${dark ? 'liquid-glass' : 'liquid-glass-light'}`}>
          <Logo dark={dark} className="h-7 sm:h-8" site={site} />
          <nav aria-label="Main" className="hidden items-center gap-9 lg:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={`nav-link ${text}`}>{l.label}</Link>
            ))}
          </nav>
          <div className="hidden items-center gap-6 lg:flex">
            {account}
            <Link href="/courses" className={`btn btn-sm ${dark ? 'bg-pearl text-noir hover:bg-white' : 'bg-noir text-pearl hover:bg-noir-mid'}`}>Explore courses</Link>
          </div>
          <details className="relative lg:hidden">
            <summary className={`micro list-none cursor-pointer rounded-[6px] px-4 py-3 ${dark ? 'bg-white/10 text-pearl' : 'bg-noir text-pearl'}`}>Menu</summary>
            <MobileMenuCloser />
            <div className="liquid-glass-light absolute right-0 z-50 mt-3 max-h-[calc(100svh-6rem)] w-[min(18rem,calc(100vw-2.5rem))] overflow-y-auto rounded-[10px] p-3">
              {[...links, { href: user ? dashboardPathFor(user.profile.role) : '/login', label: user ? 'Dashboard' : 'Log in' }].map((l) => (
                <Link key={l.href} href={l.href} className="block rounded-[4px] px-3 py-3 font-display text-[13px] font-medium uppercase tracking-[0.14em] text-ink hover:bg-white/70">{l.label}</Link>
              ))}
              <div className="mt-2 grid gap-2">
                <Link href="/courses" className="btn-primary w-full">Explore courses →</Link>
                <Link href="/franchise" className="btn-secondary w-full">Franchise →</Link>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function DemoBanner() {
  return (
    <div className="bg-noir px-4 py-2 text-center text-[12px] font-medium text-pearl">
      Demo mode — sample data, nothing is saved permanently. Add Supabase keys in <code>.env.local</code> to go live.
    </div>
  );
}

const footerCols = [
  { h: 'Learn', items: [['All courses', '/courses'], ['Tailoring', '/courses?category=tailoring'], ['Nail art', '/courses?category=nail-art'], ['Mehandi', '/courses?category=mehandi'], ['Saree draping', '/courses?category=saree-draping']] },
  { h: 'Book', items: [['All services', '/services'], ['Bridal makeup', '/services/bridal-makeup'], ['Bridal mehndi', '/services/bridal-mehndi'], ['Group & corporate', '/group-booking']] },
  { h: 'Company', items: [['About', '/about'], ['Blog', '/blog'], ['Apply as faculty', '/apply/faculty'], ['Register as a pro', '/apply/professional']] },
  { h: 'Support', items: [['Help & FAQ', '/help'], ['Contact us', '/contact'], ['Verify a certificate', '/certificates'], ['Terms', '/legal/terms'], ['Privacy', '/legal/privacy']] },
];

type FooterContent = { line1: string; line2: string; blurb: string; bigWord: string; bottomNote: string };
const SOCIAL: [string, string][] = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['linkedin', 'LinkedIn']];

export async function Footer() {
  const [site, f] = await Promise.all([getSiteSettings(), getContent<FooterContent>('page.footer')]);
  const socials = SOCIAL.filter(([k]) => site.socials?.[k]);
  return (
    <footer className="bg-noir text-pearl">
      <div className="container-page pb-10 pt-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 border-b border-white/10 pb-16 md:grid-cols-4 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] lg:gap-12">
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Logo dark className="h-9" site={site} />
            <p className="mt-8 font-display text-[30px] font-medium uppercase leading-[0.95] tracking-[-0.03em]">{f.line1}<br /><span className="accent text-stone-light">{f.line2}</span></p>
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-ink-dark-muted">{f.blurb}</p>
            <div className="mt-6 space-y-1 text-[14px]">
              {site.phone && <p><a className="hover:underline" href={site.phoneHref}>{site.phone}</a></p>}
              {site.whatsappUrl && <p><a className="hover:underline" href={site.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp us</a></p>}
              {site.email && <p><a className="hover:underline" href={`mailto:${site.email}`}>{site.email}</a></p>}
              {site.address && <p className="max-w-xs whitespace-pre-line text-ink-dark-muted">{site.address}</p>}
            </div>
            {socials.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-4">
                {socials.map(([k, label]) => <a key={k} href={site.socials[k]} target="_blank" rel="noreferrer" className="micro text-pearl/80 hover:text-white">{label}</a>)}
              </div>
            )}
          </div>
          {footerCols.map((c) => (
            <div key={c.h}>
              <p className="micro text-ink-dark-muted">{c.h}</p>
              <ul className="mt-5 space-y-3">
                {c.items.map(([label, href]) => (
                  <li key={href}><Link href={href} className="text-[14px] text-pearl/90 transition hover:text-white">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p aria-hidden className="select-none overflow-hidden py-10 text-center font-display text-[min(12.5vw,165px)] font-medium uppercase leading-[0.8] tracking-[-0.05em] text-white/[0.06]">{f.bigWord}</p>
        <div className="micro flex flex-col gap-3 text-ink-dark-muted sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {site.siteName} · All rights reserved</p>
          
        </div>
      </div>
    </footer>
  );
}




