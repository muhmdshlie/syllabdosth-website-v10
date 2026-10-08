import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter-tight/400.css';
import '@fontsource/inter-tight/500.css';
import '@fontsource/inter-tight/600.css';
import '@fontsource/italiana/400.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { LuxeMotion } from '@/components/luxe';
import { RevealOnScroll } from '@/components/motion';
import { getContent, getSiteSettings } from '@/lib/cms/content';
import { SITE_URL } from '@/lib/config';

// Every page reads live content from the database (CMS, settings, courses), so render per request.
export const dynamic = 'force-dynamic';

type Seo = { title: string; description: string; keywords: string; ogImage: string };

/** Title, description, share image and favicon come from Admin → Website Settings (SEO, Logo & branding). */
export async function generateMetadata(): Promise<Metadata> {
  const [seo, site] = await Promise.all([getContent<Seo>('settings.seo'), getSiteSettings()]);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: seo.title, template: `%s · ${site.siteName}` },
    description: seo.description,
    keywords: seo.keywords ? seo.keywords.split(',').map((k) => k.trim()).filter(Boolean) : undefined,
    openGraph: { siteName: site.siteName, type: 'website', images: seo.ogImage ? [seo.ogImage] : undefined },
    icons: site.favicon ? { icon: site.favicon, apple: site.favicon } : undefined,
  };
}

export async function generateViewport(): Promise<Viewport> {
  const site = await getSiteSettings();
  return { themeColor: site.themeColor || '#0B0B0B' };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-pearl focus:px-4 focus:py-2">Skip to content</a>
        {children}
        <RevealOnScroll />
        <LuxeMotion />
      </body>
    </html>
  );
}
