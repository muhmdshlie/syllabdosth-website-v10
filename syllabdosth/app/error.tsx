'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container-page py-24">
      <h1 className="h1">Something went wrong.</h1>
      <p className="body-l mt-3 text-ink-deep-muted">Please try again. If it keeps happening, contact us on WhatsApp.</p>
      <button onClick={reset} className="btn-primary mt-8">Try again</button>
    </main>
  );
}
