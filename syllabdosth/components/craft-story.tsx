'use client';

/**
 * Split-screen scroll story (editorial, like a luxury product page):
 * the section pins while you scroll; the photo on the black side changes scene by scene,
 * and a frosted off-white glass panel on the other side swaps its copy.
 * Four scenes: Learn → Create → Master → Earn.
 */
import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { StoryScene } from '@/lib/images';

export function CraftStory({ scenes }: { scenes: StoryScene[] }) {
  const wrap = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = wrap.current, st = stage.current;
      if (!el || !st) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      const scaled = p * scenes.length;
      const idx = Math.min(scenes.length - 1, Math.floor(scaled));
      st.style.setProperty('--p', p.toFixed(4));
      st.style.setProperty('--lp', Math.min(1, scaled - idx).toFixed(4));
      setActive((a) => (a === idx ? a : idx));
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [scenes.length]);

  return (
    <section ref={wrap} className="relative bg-noir" style={{ height: `${scenes.length * 100 + 40}vh` }} aria-label="How you grow with Syllabdosth">
      <div ref={stage} className="sticky top-0 grid h-[100svh] grid-rows-[44%_56%] overflow-hidden lg:grid-cols-2 lg:grid-rows-1">
        {/* LEFT — black stage with the photo */}
        <div className="relative flex items-center justify-center overflow-hidden bg-noir">
          <p className="micro absolute left-5 top-24 z-10 text-ink-dark-muted sm:left-8 lg:top-28">
            {String(active + 1).padStart(2, '0')} / {String(scenes.length).padStart(2, '0')}
          </p>
          <p className="micro absolute bottom-5 left-5 z-10 max-w-[200px] text-ink-dark-muted sm:left-8 lg:bottom-8">The Syllabdosth path — from first class to paid bookings</p>
          <div className="story2-photo-frame">
            {scenes.map((s, i) => (
              <div key={i} className={`story2-photo ${i === active ? 'is-on' : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.center.src} alt={i === active ? s.center.alt : ''} loading={i === 0 ? 'eager' : 'lazy'} className="h-full w-full object-cover" />
                <span aria-hidden className="photo-glass" />
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — blurred photo behind a frosted off-white glass panel */}
        <div className="relative overflow-hidden">
          {scenes.map((s, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={s.center.src} alt="" aria-hidden className={`story2-blur ${i === active ? 'is-on' : ''}`} />
          ))}
          <div className="story2-panel">
            <div className="story2-scenes">
              {scenes.map((s, i) => (
                <div key={i} className={`story2-scene ${i === active ? 'is-on' : ''}`} aria-hidden={i !== active}>
                  <p className="eyebrow text-ink-soft">{s.eyebrow}</p>
                  <h3 className="mt-3 font-display text-[44px] font-medium uppercase leading-[0.9] tracking-[-0.04em] text-noir sm:text-[64px] lg:text-[84px]">{s.word}</h3>
                  <p className="accent mt-1 text-[20px] leading-[1.05] text-noir/80 sm:text-[30px]">{s.line}</p>
                  <ul className="mt-6 divide-y divide-noir/10 border-y border-noir/10 lg:mt-8">
                    {s.callouts.map((c, ci) => (
                      <li key={ci} className="story2-row flex items-center gap-4 py-3 sm:py-3.5" style={{ '--ci': ci } as CSSProperties}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.img} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-[3px] object-cover sm:h-12 sm:w-12" />
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-[13px] font-medium uppercase tracking-[0.08em] text-noir">{c.title}</p>
                          <p className="text-[13px] leading-snug text-ink-soft">{c.text}</p>
                        </div>
                        <span aria-hidden className="text-ink-soft">→</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between gap-4 lg:mt-8">
              <div className="flex flex-1 gap-2" aria-hidden>
                {scenes.map((s, i) => (
                  <span key={i} className="h-px flex-1 overflow-hidden bg-noir/15">
                    <span className="block h-full origin-left bg-noir" style={{ transform: i < active ? 'scaleX(1)' : i === active ? 'scaleX(var(--lp))' : 'scaleX(0)' }} />
                  </span>
                ))}
              </div>
              <Link href="/courses" className="btn btn-sm shrink-0 !bg-noir !text-pearl hover:!bg-noir-mid">Explore courses</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
