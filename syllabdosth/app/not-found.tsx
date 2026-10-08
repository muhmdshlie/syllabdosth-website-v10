import Link from 'next/link';
import { Footer, Nav } from '@/components/site';

export default function NotFound() {
  return (
    <>
      <Nav />
      <main id="main" className="container-page py-24">
        <p className="eyebrow text-ink-deep-muted">404</p>
        <h1 className="h-display mt-3">This page isn&apos;t here.</h1>
        <p className="body-l mt-4 max-w-xl text-ink-deep-muted">The link may be old, or the page has moved. Try one of these instead.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn-primary">Go home</Link>
          <Link href="/courses" className="btn-secondary">Browse courses</Link>
          <Link href="/services" className="btn-secondary">Book a service</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
