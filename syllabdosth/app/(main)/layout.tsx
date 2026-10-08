import { Footer, Nav } from '@/components/site';
import { MaintenanceGate, SiteExtras } from '@/components/site-extras';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <MaintenanceGate>
      <Nav />
      <main id="main" className="min-h-[60vh]">{children}</main>
      <Footer />
      <SiteExtras />
    </MaintenanceGate>
  );
}
