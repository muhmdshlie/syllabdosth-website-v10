import { headers } from 'next/headers';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getContent, getSiteSettings } from '@/lib/cms/content';

type Addons = { whatsapp: { enabled: boolean; message: string }; analytics: { enabled: boolean; id: string }; pixel: { enabled: boolean; id: string } };
type Maintenance = { enabled: boolean; title: string; message: string };

/** Public-site add-ons from Admin → Addon: WhatsApp button, Google Analytics, Meta Pixel. */
export async function SiteExtras() {
  const [a, site] = await Promise.all([getContent<Addons>('settings.addons'), getSiteSettings()]);
  const ga = a.analytics.enabled && /^G-[A-Z0-9]+$/i.test(a.analytics.id) ? a.analytics.id : '';
  const px = a.pixel.enabled && /^\d{6,20}$/.test(a.pixel.id) ? a.pixel.id : '';
  const wa = a.whatsapp.enabled && site.whatsappUrl ? `${site.whatsappUrl}${a.whatsapp.message ? `?text=${encodeURIComponent(a.whatsapp.message)}` : ''}` : '';
  return (
    <>
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp" data-testid="whatsapp-button"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_-10px_rgba(0,0,0,.5)] transition hover:scale-105">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z" /></svg>
        </a>
      )}
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}');`}</Script>
        </>
      )}
      {px && <Script id="fb-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${px}');fbq('track','PageView');`}</Script>}
    </>
  );
}

/** Maintenance mode (Admin → Website Settings): visitors see a holding page, admins see the site. */
export async function MaintenanceGate({ children }: { children: ReactNode }) {
  const m = await getContent<Maintenance>('settings.maintenance');
  if (!m.enabled) return <>{children}</>;
  const path = headers().get('x-pathname') ?? '';
  if (/^\/(login|signup|forgot-password|account|auth)(\/|$)/.test(path)) return <>{children}</>; // staff can still log in
  const user = await getCurrentUser();
  if (user?.profile.role === 'admin') {
    return (
      <>
        <div className="bg-[#F4A51C] px-4 py-2 text-center text-[12px] font-semibold text-noir">Maintenance mode is ON — visitors can’t see the website. <a className="underline" href="/admin/settings/maintenance">Turn it off</a></div>
        {children}
      </>
    );
  }
  const site = await getSiteSettings();
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center bg-noir px-6 text-center text-pearl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={site.logoLight} alt={site.siteName} className="h-10 w-auto" />
      <h1 className="mt-10 font-display text-[36px] font-medium uppercase tracking-[-0.02em] sm:text-[56px]">{m.title}</h1>
      <p className="mt-4 max-w-md text-ink-dark-muted">{m.message}</p>
      {site.whatsappUrl && <a href={site.whatsappUrl} className="btn-primary mt-8" target="_blank" rel="noreferrer">WhatsApp us</a>}
      <a href="/login" className="micro mt-10 text-ink-dark-muted underline">Staff login</a>
    </main>
  );
}
