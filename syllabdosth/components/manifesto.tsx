'use client';

/**
 * Big uppercase manifesto paragraph; each word brightens as it scrolls through the viewport.
 */
import { useEffect, useRef } from 'react';

export function Manifesto({ text, footnotes }: { text: string; footnotes?: [string, string] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = Array.from(el.querySelectorAll<HTMLSpanElement>('[data-w]'));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { words.forEach((w) => (w.style.opacity = '1')); return; }
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the block's top reaches 85% of the screen, 1 when its bottom reaches 45%
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.4)));
      const lit = p * words.length;
      words.forEach((w, i) => { w.style.opacity = String(Math.min(1, Math.max(0.14, lit - i + 0.14))); });
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); };
  }, []);

  return (
    <section className="bg-noir py-24 text-pearl sm:py-36">
      <div className="container-page">
        <div ref={ref} aria-label={text}>
          <p aria-hidden className="font-display text-[26px] font-medium uppercase leading-[1.08] tracking-[-0.02em] sm:text-[44px] lg:text-[56px]" style={{ textAlign: 'justify', textAlignLast: 'left' }}>
            {text.split(' ').map((w, i) => (
              <span key={i} data-w style={{ opacity: 0.14, transition: 'opacity 0.25s linear' }}>{w} </span>
            ))}
          </p>
        </div>
        {footnotes && (
          <div className="micro mt-16 grid gap-6 text-ink-dark-muted sm:ml-auto sm:max-w-xl sm:grid-cols-2">
            <p>{footnotes[0]}</p>
            <p>{footnotes[1]}</p>
          </div>
        )}
      </div>
    </section>
  );
}
