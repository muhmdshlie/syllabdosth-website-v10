'use client';

/**
 * Home hero, editorial style: the section pins while you scroll; the framed photo opens up to
 * full-bleed, the headline lifts away, and a second line ("Explore every craft") fades in.
 */
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { DepthPhoto } from './depth-photo';
import { Words } from './motion';

export type HeroCopy = { topLeft: string; topRight: string; title1: string; title2: string; primaryCta: string; secondaryCta: string; second1: string; second2: string };
type Props = {
  photo: { src: string; alt: string; depth?: string; focus?: [number, number] };
  stats: { value: string; label: string }[];
  copy: HeroCopy;
};

const lines = (t: string) => t.split('\n').map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>);

export function HeroReveal({ photo, stats, copy }: Props) {
  const wrap = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const update = () => {
      const el = wrap.current, st = stage.current;
      if (!el || !st) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const s = reduce ? 0 : total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      st.style.setProperty('--s', s.toFixed(4));
      st.dataset.past = s > 0.45 ? '1' : '0';
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  return (
    <section ref={wrap} className="hero-reveal bg-noir text-pearl" aria-label="Syllabdosth">
      <div ref={stage} className="sticky top-0 h-[100svh] overflow-hidden">
        {/* photo that opens up as you scroll */}
        <div className="hero-photo">
          <div className="hero-photo-inner">
            <div className="anim-unmask delay-1 relative h-full w-full">
              {photo.depth ? (
                <DepthPhoto src={photo.src} depth={photo.depth} alt={photo.alt} focus={photo.focus} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.src} alt={photo.alt} className="h-full w-full object-cover" />
              )}
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-noir/30 via-transparent to-noir/75" aria-hidden />
          <span aria-hidden className="photo-glass" />
        </div>

        {/* first screen: headline */}
        <div className="hero-copy container-page relative flex h-full flex-col justify-between pb-10 pt-32 lg:pb-12 lg:pt-36">
          <div className="flex items-start justify-between gap-6">
            <p className="micro anim-fade-up max-w-[180px] text-ink-dark-muted">{lines(copy.topLeft)}</p>
            <p className="micro anim-fade-up delay-1 hidden max-w-[220px] text-right text-ink-dark-muted sm:block">{lines(copy.topRight)}</p>
          </div>

          <div>
            <h1 className="h-display">
              <Words text={copy.title1} start={0.2} />
              <br />
              <span className="accent block text-[0.82em] leading-[0.95] tracking-[0.005em] text-pearl/90"><Words text={copy.title2} start={0.55} /></span>
            </h1>
            <div className="anim-fade-up delay-6 mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <Link href="/courses" className="btn-primary">{copy.primaryCta} <span aria-hidden>→</span></Link>
                <Link href="/services" className="btn-ghost-dark">{copy.secondaryCta}</Link>
              </div>
              <dl className="grid gap-4 sm:gap-10" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(stats.length, 5))}, minmax(0, 1fr))` }}>
                {stats.map((s, i) => (
                  <div key={i}>
                    <dt className="sr-only">{s.label}</dt>
                    <dd className="font-display text-[22px] font-medium tracking-[-0.02em] sm:text-[28px]">{s.value}</dd>
                    <dd className="micro mt-1 max-w-[90px] text-ink-dark-muted max-sm:!text-[9px] max-sm:!tracking-[0.08em]">{s.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* second beat: appears as the photo opens */}
        <div className="hero-second pointer-events-none absolute inset-x-0 bottom-[12vh] text-center" aria-hidden>
          <p className="font-display text-[28px] font-medium uppercase tracking-[-0.02em] sm:text-[52px]">{copy.second1}</p>
          <p className="accent text-[22px] text-pearl/85 sm:text-[40px]">{copy.second2}</p>
        </div>

        <div className="hero-scroll micro absolute bottom-6 left-1/2 -translate-x-1/2 text-ink-dark-muted" aria-hidden>Scroll</div>
      </div>
    </section>
  );
}
