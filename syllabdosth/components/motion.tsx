'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Scroll reveal. Mark any element with data-reveal (or data-reveal="left" / "zoom")
 * and it fades up the first time it scrolls into view. Stagger with style={{ '--d': '0.1s' }}.
 * Content stays visible if JavaScript is off: elements are only hidden once this runs.
 */
export function RevealOnScroll() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    root.classList.add('reveal-ready');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [pathname]);
  return null;
}

/** Counts up to a stat like "200+", "20k+" or "4.9★" when it scrolls into view. */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const m = value.match(/^([\d.]+)(.*)$/);
  const target = m ? parseFloat(m[1]) : 0;
  const decimals = m && m[1].includes('.') ? m[1].split('.')[1].length : 0;
  const suffix = m ? m[2] : '';
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!m || !ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setShown((0).toFixed(decimals) + suffix);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / 1600);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown((target * eased).toFixed(decimals) + suffix);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span ref={ref} className={className} aria-label={value}>
      <span aria-hidden>{shown}</span>
    </span>
  );
}

/** Gentle 3D tilt that follows the mouse (desktop only). */
export function Tilt({ children, className, max = 6 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    setStyle({ transform: `perspective(1000px) rotateY(${x * max}deg) rotateX(${-y * max}deg)` });
  };
  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={() => setStyle({ transform: 'perspective(1000px) rotateY(0) rotateX(0)' })}
      style={{ ...style, transition: 'transform 0.4s cubic-bezier(0.2,0.7,0.2,1)', transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
}

/**
 * Photo with a soft stone-and-taupe placeholder behind it. If the image fails to load,
 * the placeholder stays instead of a broken-image icon.
 */
export function Photo({ src, alt = '', className = '', imgClassName = '', eager = false }: { src: string; alt?: string; className?: string; imgClassName?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden graded bg-gradient-to-br from-stone-pale via-paper-deep to-taupe-light ${className}`}>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      )}
      {/* iOS "Clear"-style glass edge: specular rim + soft inner glow */}
      <span aria-hidden className="photo-glass" />
    </div>
  );
}

/** Splits a line into words that blur-rise in one after another. */
export function Words({ text, start = 0, step = 0.08, className = '' }: { text: string; start?: number; step?: number; className?: string }) {
  return (
    <span aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} aria-hidden className="anim-word" style={{ animationDelay: `calc(var(--intro, 0s) + ${start + i * step}s)` }}>
          {/* style goes on the inner span so effects like foil text survive the animation layer */}
          <span className={className}>{w}</span>{'\u00a0'}
        </span>
      ))}
    </span>
  );
}

/** Moves its children slower than the page as you scroll (subtle depth). */
export function Parallax({ children, speed = 0.12, className }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    // desktop only, and never more than 40px of drift
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(min-width: 1024px)').matches) return;
    let raf = 0;
    const update = () => {
      const r = el.getBoundingClientRect();
      const offset = Math.max(-40, Math.min(40, (r.top + r.height / 2 - window.innerHeight / 2) * -speed));
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [speed]);
  return <div ref={ref} className={className} style={{ willChange: 'transform' }}>{children}</div>;
}
