'use client';

/**
 * Site-wide motion (mounted once in app/layout.tsx), deliberately restrained:
 *  - smooth scrolling (Lenis) on desktop
 *  - a hairline scroll-progress line
 * Off for "reduce motion"; touch screens keep native scrolling.
 */
import Lenis from 'lenis';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function LuxeMotion() {
  const pathname = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  const inAdmin = pathname?.startsWith('/admin') ?? false;

  useEffect(() => {
    if (inAdmin) return; // the admin panel keeps native scrolling
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;
    let raf = 0;
    if (!reduce && fine) {
      const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
      lenisRef.current = lenis;
      const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${h > 0 ? Math.min(1, window.scrollY / h) : 0})`;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); lenisRef.current?.destroy(); lenisRef.current = null; window.removeEventListener('scroll', onScroll); };
  }, [inAdmin]);

  useEffect(() => { lenisRef.current?.scrollTo(0, { immediate: true }); }, [pathname]);

  if (inAdmin) return null;
  return <div ref={bar} className="scroll-progress" aria-hidden />;
}
