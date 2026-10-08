import { Intro } from '@/components/intro';
import { Footer, Nav } from '@/components/site';
import { MaintenanceGate, SiteExtras } from '@/components/site-extras';
import { getSiteSettings } from '@/lib/cms/content';

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const site = await getSiteSettings();
  return (
    <MaintenanceGate>
      <Intro logo={site.logoLight} />
      <Nav dark />
      <main id="main">{children}</main>
      <Footer />
      <SiteExtras />
    </MaintenanceGate>
  );
}
