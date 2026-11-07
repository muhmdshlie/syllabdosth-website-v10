'use client';

/**
 * Canvas fireworks for the hero's Diwali side boxes (components/diwali-decor.tsx): rockets, gold bursts with
 * light flashes, crackling glitter, a waving sparkler and small ground crackers. Each side runs its own random
 * schedule. The loop only runs while the hero is on screen, the photo hasn't opened yet and the tab is visible.
 * With reduced motion it never starts (the canvas is also hidden in CSS). Sound: components/fireworks-sound.ts.
 */
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FireworksSound, type FwSide, type FwSound } from './fireworks-sound';

export type SoundRef = React.MutableRefObject<FireworksSound | null>;

// gold, warm white, amber, champagne, rose-gold
const COLORS = ['255,214,130', '255,244,214', '255,181,71', '245,217,139', '255,168,118'];
const GOLD = 0, WHITE = 1, AMBER = 2, CHAMPAGNE = 3;
type Kind = 'peony' | 'willow' | 'crackle' | 'ring' | 'palm';

// Different timings and burst mixes per side, so the two sides never fall into step.
const SIDES: Record<FwSide, { first: number; rocket: [number, number]; salvo: number; cracker: [number, number]; sparkler: number; kinds: [Kind, number][] }> = {
  left: { first: 2.4, rocket: [1.9, 4.6], salvo: 0.22, cracker: [8, 15], sparkler: 3.5, kinds: [['peony', 3], ['willow', 3], ['crackle', 2], ['ring', 1], ['palm', 2]] },
  right: { first: 3.3, rocket: [2.3, 5.3], salvo: 0.3, cracker: [6, 13], sparkler: 9, kinds: [['peony', 2], ['willow', 2], ['crackle', 3], ['ring', 2], ['palm', 1]] },
};

// particle flags
const TWINKLE = 1, TRAIL = 2, BRANCH = 4;
type P = { x: number; y: number; px: number; py: number; vx: number; vy: number; age: number; life: number; c: number; w: number; drag: number; g: number; f: number; ct: number };
type Rocket = { x: number; y: number; vx: number; vy: number; g: number; r: number; kind: Kind; acc: number };
type Flash = { x: number; y: number; r: number; age: number; life: number; a: number };
type Sparkler = { age: number; dur: number; cx: number; cy: number; ax: number; ay: number; sp: number; ph: number; hx: number; hy: number; hist: number[]; acc: number; ping: number };

const R = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const pickColor = () => (Math.random() < 0.5 ? GOLD : Math.random() < 0.5 ? CHAMPAGNE : Math.random() < 0.6 ? WHITE : Math.random() < 0.7 ? AMBER : 4);

/** Soft round glow, pre-rendered once per colour (drawImage is far cheaper than shadowBlur). */
function sprite(rgb: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.15, `rgba(${rgb},0.9)`);
  grad.addColorStop(0.45, `rgba(${rgb},0.25)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

export function FireworksCanvas({ side, sound }: { side: FwSide; sound?: SoundRef }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cfg = SIDES[side];
    const sprites = COLORS.map(sprite);
    const kindTotal = cfg.kinds.reduce((s, [, n]) => s + n, 0);
    const emit = (e: FwSound) => sound?.current?.play(e);

    let w = 0, h = 0, k = 1, lw = 1, density = 1, mini = false;
    const parts: P[] = [], rockets: Rocket[] = [], flashes: Flash[] = [], timers: { at: number; fn: () => void }[] = [];
    let t = 0, idle = 0;
    let nextRocket = cfg.first, nextCracker = cfg.first + R(...cfg.cracker) * 0.5, nextSpark = cfg.sparkler;
    let spark: Sparkler | null = null;

    const cap = () => 900 * density;
    const spawn = (x: number, y: number, vx: number, vy: number, life: number, c: number, w: number, drag: number, g: number, f = 0, ct = 0) => {
      parts.push({ x, y, px: x, py: y, vx, vy, age: 0, life, c, w, drag, g, f, ct });
    };
    const pickKind = (): Kind => {
      let n = Math.random() * kindTotal;
      for (const [kind, wt] of cfg.kinds) if ((n -= wt) < 0) return kind;
      return 'peony';
    };

    const burst = (x: number, y: number, r: number, kind: Kind) => {
      const c1 = pickColor(), c2 = Math.random() < 0.35 ? pickColor() : c1;
      const size = clamp((r - 18) / 90, 0, 1);
      flashes.push({ x, y, r: r * 1.5, age: 0, life: 0.34, a: 0.28 + size * 0.22 });
      // Directions on a sphere, projected flat: denser in the middle like a real shell.
      const sphere = (n: number, drag: number, fn: (vx: number, vy: number, i: number) => void) => {
        for (let i = 0; i < n; i++) {
          const u = R(-1, 1), th = R(0, Math.PI * 2), s = r * drag * Math.sqrt(1 - u * u) * R(0.9, 1.04);
          fn(Math.cos(th) * s, Math.sin(th) * s, i);
        }
      };
      if (kind === 'peony') {
        sphere(Math.round(90 * density), 2.4, (vx, vy, i) => spawn(x, y, vx, vy, R(1.1, 1.6), i % 2 ? c2 : c1, 1.8, 2.4, 35 * k, Math.random() < 0.5 ? TWINKLE : 0));
      } else if (kind === 'willow') {
        sphere(Math.round(70 * density), 2, (vx, vy) => spawn(x, y, vx * 0.95, vy * 0.95, R(2.4, 3.2), Math.random() < 0.5 ? GOLD : AMBER, 1.4, 2, 22 * k, TRAIL | TWINKLE));
      } else if (kind === 'crackle') {
        // each star crackles out at its own moment between ~0.55s and ~1.5s (the crackle sound covers the same span)
        sphere(Math.round(80 * density), 2.6, (vx, vy) => { const life = R(0.9, 1.5); spawn(x, y, vx, vy, life, CHAMPAGNE, 1.5, 2.6, 30 * k, 0, life * R(0.62, 0.98)); });
        timers.push({ at: t + 0.55, fn: () => emit({ type: 'crackle', side, x: x / w, size }) });
      } else if (kind === 'ring') {
        const n = Math.round(48 * clamp(density, 0.5, 1)), tilt = R(0.45, 0.9), rot = R(0, Math.PI);
        for (let i = 0; i < n; i++) {
          const th = (i / n) * Math.PI * 2, s = r * 2.4 * R(0.97, 1.02);
          const ax = Math.cos(th) * s, ay = Math.sin(th) * s * tilt;
          spawn(x, y, ax * Math.cos(rot) - ay * Math.sin(rot), ax * Math.sin(rot) + ay * Math.cos(rot), R(1.2, 1.5), c1, 1.8, 2.4, 30 * k);
        }
        sphere(Math.round(14 * density), 2.4, (vx, vy) => spawn(x, y, vx * 0.35, vy * 0.35, R(0.8, 1.2), WHITE, 1.2, 2.4, 30 * k, TWINKLE));
      } else {
        const arms = 7 + Math.floor(Math.random() * 3), base = R(0, Math.PI * 2);
        for (let a = 0; a < arms; a++) {
          const th = base + (a / arms) * Math.PI * 2 + R(-0.15, 0.15);
          for (let j = 0; j < 5; j++) {
            const s = r * 2.2 * (1 - j * 0.06) * R(0.95, 1.03);
            spawn(x, y, Math.cos(th) * s, Math.sin(th) * s, R(1.6, 2.1), j ? AMBER : GOLD, j ? 1.5 : 2.4, 2.2, 45 * k, j ? TWINKLE : TRAIL);
          }
        }
      }
      emit({ type: 'burst', side, x: x / w, size });
    };

    const launch = () => {
      if (w < 60 || h < 40) return;
      const r = clamp(Math.min(w, h) * R(0.2, 0.32), 16, 140);
      if (mini) return burst(R(r + 4, w - r - 4), R(r + 4, Math.max(r + 5, h - r - 4)), r, pickKind());
      const tx = R(r + 6, w - r - 6), ty = R(r + 6, Math.max(r + 8, h * 0.48));
      const x0 = clamp(tx + R(-0.12, 0.12) * w, 8, w - 8), y0 = h + 4;
      const g = 240 * k, vy = -Math.sqrt(2 * g * (y0 - ty)), dur = -vy / g;
      rockets.push({ x: x0, y: y0, vx: (tx - x0) / dur, vy, g, r, kind: pickKind(), acc: 0 });
      if (Math.random() < 0.65) emit({ type: 'launch', side, x: x0 / w, dur });
    };

    const cracker = (x: number) => {
      const y = h - 3;
      flashes.push({ x, y, r: 26 * k + 10, age: 0, life: 0.18, a: 0.6 });
      const n = Math.round(22 * density + 6);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + R(-0.9, 0.9), s = R(90, 220) * k;
        spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, R(0.3, 0.65), Math.random() < 0.5 ? WHITE : AMBER, 1.3, 1.6, 320 * k, TWINKLE);
      }
      emit({ type: 'pop', side, x: x / w });
    };
    // a single cracker, or a short chain (ladi) that pops along the ground
    const crackers = () => {
      const count = Math.random() < 0.45 ? 3 + Math.floor(Math.random() * 4) : 1;
      const x0 = R(0.15, 0.85) * w, dir = x0 > w / 2 ? -1 : 1;
      let at = t;
      for (let i = 0; i < count; i++) {
        const x = clamp(x0 + dir * i * R(8, 16) * k, 6, w - 6);
        timers.push({ at, fn: () => cracker(x) });
        at += R(0.07, 0.16);
      }
    };

    const startSparkler = () => {
      spark = {
        age: 0, dur: R(7, 11), cx: w * (side === 'left' ? R(0.3, 0.45) : R(0.55, 0.7)), cy: h * R(0.62, 0.72),
        ax: Math.min(w * 0.18, 60 * k), ay: Math.min(h * 0.1, 26 * k), sp: R(1.1, 1.6), ph: R(0, 6), hx: 0, hy: 0, hist: [], acc: 0, ping: 0,
      };
    };
    const stopSparkler = () => {
      if (spark) emit({ type: 'fizz', side, x: spark.cx / w, on: false });
      spark = null;
    };

    const schedule = () => {
      if (t >= nextRocket) {
        launch();
        if (Math.random() < cfg.salvo) for (let i = 1, m = Math.random() < 0.4 ? 2 : 1; i <= m; i++) timers.push({ at: t + i * R(0.25, 0.6), fn: launch });
        nextRocket = t + R(...cfg.rocket);
      }
      if (!mini && t >= nextCracker) { crackers(); nextCracker = t + R(...cfg.cracker); }
      if (!mini && !spark && t >= nextSpark) startSparkler();
      for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= t) timers.splice(i, 1)[0].fn();
    };

    const update = (dt: number) => {
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.vy += r.g * dt; r.x += r.vx * dt; r.y += r.vy * dt;
        for (r.acc += dt * 70; r.acc >= 1; r.acc--) spawn(r.x, r.y, R(-15, 15) * k, R(10, 40) * k, R(0.25, 0.5), AMBER, 1.1, 3, 60 * k, TWINKLE);
        if (r.vy >= -20 * k) { burst(r.x, r.y, r.r, r.kind); rockets.splice(i, 1); }
      }
      if (spark) {
        const s = spark;
        s.age += dt;
        const on = clamp(Math.min(s.age / 0.6, (s.dur - s.age) / 0.8), 0, 1);
        const a = s.age * s.sp + s.ph;
        s.hx = s.cx + s.ax * Math.sin(a); s.hy = s.cy + s.ay * Math.sin(2 * a); // a slow figure-eight, like a hand waving it
        s.hist.push(s.hx, s.hy);
        if (s.hist.length > 28) s.hist.splice(0, 2);
        // re-announced every half second so the fizz also starts if sound is switched on mid-sparkler
        if ((s.ping -= dt) <= 0) { s.ping = 0.5; emit({ type: 'fizz', side, x: s.cx / w, on: true }); }
        for (s.acc += dt * 110 * on * density; s.acc >= 1; s.acc--) {
          const ang = R(0, Math.PI * 2), sp = R(70, 230) * k;
          spawn(s.hx, s.hy, Math.cos(ang) * sp, Math.sin(ang) * sp, R(0.12, 0.38), Math.random() < 0.6 ? WHITE : GOLD, 1, 4.2, 90 * k, BRANCH | (Math.random() < 0.4 ? TWINKLE : 0));
        }
        if (s.age >= s.dur) { stopSparkler(); nextSpark = t + R(10, 20); }
      }
      const max = cap();
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) {
          // sparkler sparks fork as they die
          if (p.f & BRANCH && Math.random() < 0.35) for (let j = 0, n = 2 + (Math.random() < 0.5 ? 1 : 0); j < n; j++) {
            const ang = R(0, Math.PI * 2), sp = R(40, 110) * k;
            spawn(p.x, p.y, Math.cos(ang) * sp, Math.sin(ang) * sp, R(0.05, 0.14), WHITE, 0.8, 5, 60 * k);
          }
          parts[i] = parts[parts.length - 1];
          parts.pop();
          continue;
        }
        const dr = Math.exp(-p.drag * dt);
        p.px = p.x; p.py = p.y;
        p.vx *= dr; p.vy = p.vy * dr + p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.f & TRAIL && parts.length < max && Math.random() < dt * 28) spawn(p.x, p.y, p.vx * 0.05, p.vy * 0.05, R(0.4, 0.9), p.c, 0.9, 2, 25 * k, TWINKLE);
        if (p.ct && p.age > p.ct) {
          // crackle: the star snaps into a short white strobe
          p.ct = 0; p.age = p.life;
          if (Math.random() < 0.8) for (let j = 0, n = Math.random() < 0.5 ? 2 : 1; j < n; j++) spawn(p.x + R(-3, 3), p.y + R(-3, 3), 0, 0, R(0.05, 0.12), WHITE, 2.2, 0, 0);
        }
      }
      for (let i = flashes.length - 1; i >= 0; i--) if ((flashes[i].age += dt) >= flashes[i].life) flashes.splice(i, 1);
    };

    const draw = (dt: number) => {
      const empty = !parts.length && !rockets.length && !flashes.length && !spark;
      idle = empty ? idle + 1 : 0;
      if (idle > 30) { if (idle === 31) ctx.clearRect(0, 0, w, h); return; }
      // fade the previous frame instead of clearing it: that leaves the glowing trails
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(0,0,0,${1 - Math.pow(0.78, dt * 60)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const f of flashes) {
        const q = 1 - f.age / f.life;
        ctx.globalAlpha = f.a * q * q;
        ctx.drawImage(sprites[CHAMPAGNE], f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      }
      for (const r of rockets) {
        const s = 5 * Math.max(k, 0.6);
        ctx.globalAlpha = 0.9;
        ctx.drawImage(sprites[AMBER], r.x - s, r.y - s, s * 2, s * 2);
      }
      let lc = -1;
      for (const p of parts) {
        let a = Math.min(1, (1 - p.age / p.life) * 1.6);
        if (p.f & TWINKLE) a *= 0.35 + Math.random() * 0.65;
        if (p.c !== lc) { ctx.strokeStyle = `rgb(${COLORS[p.c]})`; lc = p.c; }
        ctx.globalAlpha = a;
        ctx.lineWidth = p.w * lw;
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
        if (p.w >= 1.6 && a > 0.4) {
          const s = p.w * 3.2 * lw;
          ctx.globalAlpha = a * 0.5;
          ctx.drawImage(sprites[p.c], p.x - s, p.y - s, s * 2, s * 2);
        }
      }
      if (spark) {
        const s = spark, on = clamp(Math.min(s.age / 0.6, (s.dur - s.age) / 0.8), 0, 1);
        // the wire, from the hand to the burning tip
        ctx.globalAlpha = 0.2 * on;
        ctx.strokeStyle = `rgb(${COLORS[AMBER]})`;
        ctx.lineWidth = 1.2 * lw;
        ctx.beginPath(); ctx.moveTo(s.cx + 6 * k, s.cy + 46 * k); ctx.lineTo(s.hx, s.hy); ctx.stroke();
        // the tip's glowing trail
        ctx.strokeStyle = `rgb(${COLORS[GOLD]})`;
        const n = s.hist.length / 2;
        for (let i = 1; i < n; i++) {
          ctx.globalAlpha = (i / n) * 0.55 * on;
          ctx.lineWidth = (0.6 + (2 * i) / n) * lw;
          ctx.beginPath(); ctx.moveTo(s.hist[i * 2 - 2], s.hist[i * 2 - 1]); ctx.lineTo(s.hist[i * 2], s.hist[i * 2 + 1]); ctx.stroke();
        }
        const hs = (9 + Math.random() * 4) * Math.max(k, 0.6) * on;
        ctx.globalAlpha = 1;
        ctx.drawImage(sprites[WHITE], s.hx - hs, s.hy - hs, hs * 2, hs * 2);
      }
    };

    const resize = () => {
      w = cv.clientWidth; h = cv.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      k = clamp(Math.min(w, h) / 300, 0.35, 1.15);
      lw = clamp(k, 0.6, 1.1);
      density = clamp((w * h) / (320 * 280), 0.3, 1.1);
      mini = h < 160; // phones: one small box in the top band, so small bursts only
      if (mini) stopSparkler();
      idle = 0;
    };

    // Run only while it can be seen: on screen, tab visible, and before the photo opens (the decor fades out then).
    let visible = false, past = false, running = false, raf = 0, last = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (w > 1 && h > 1) { t += dt; schedule(); update(dt); draw(dt); }
      raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      const want = visible && !past && !document.hidden;
      if (want === running) return;
      running = want;
      if (want) { last = performance.now(); raf = requestAnimationFrame(frame); }
      else { cancelAnimationFrame(raf); if (spark) emit({ type: 'fizz', side, x: spark.cx / w, on: false }); }
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); });
    io.observe(cv);
    // .dw's parent is the hero's sticky stage, which sets data-past once the photo has opened
    const stage = cv.closest('.dw')?.parentElement;
    const mo = stage ? new MutationObserver(() => { past = stage.dataset.past === '1'; sync(); }) : null;
    if (stage) mo?.observe(stage, { attributes: true, attributeFilter: ['data-past'] });
    document.addEventListener('visibilitychange', sync);
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      stopSparkler();
      io.disconnect(); mo?.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [side, sound]);

  return <canvas ref={ref} className="dw-fw dw-m" />;
}

/** Sound state for the hero: the engine is created on the first click (never autoplays) and closed on unmount. */
export function useFireworksSound() {
  const sound = useRef<FireworksSound | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => () => { sound.current?.close(); sound.current = null; }, []);
  const toggle = useCallback(() => {
    const next = !on;
    (sound.current ??= new FireworksSound()).setEnabled(next);
    setOn(next);
  }, [on]);
  return { sound, on, toggle };
}

/** Small floating speaker button in a corner of the right decor box; fades out with the decor as you scroll. */
export function FireworksToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(!!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)); }, []);
  if (!ok) return null;
  const label = on ? 'Mute fireworks sound' : 'Play fireworks sound';
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} aria-label={label} title={label} className={`dw-sound liquid-glass${on ? ' is-on' : ''}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fillOpacity="0.15" />
        {on ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
      </svg>
    </button>
  );
}
