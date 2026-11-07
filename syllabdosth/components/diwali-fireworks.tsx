'use client';

/**
 * Canvas fireworks for the hero (components/hero-reveal.tsx). One canvas covers the whole hero stage, edge to edge,
 * and sits under the photo frame, so the photo hides anything behind it and the fireworks show wherever the black
 * background does (beside the photo on desktop; above, beside and below it on phones). Before every burst it
 * measures the hero's real text, buttons, stats, nav, sound button and photo frame and only places fireworks where
 * they fit, so they never sit behind the content whatever the CMS copy is; burst centres also avoid the diyas.
 * The loop only runs while the hero is on screen, the photo hasn't opened yet and the tab is visible; with
 * reduced motion it never starts (the canvas is also hidden in CSS). Sound: components/fireworks-sound.ts.
 */
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FireworksSound, type FwSide, type FwSound } from './fireworks-sound';

export type SoundRef = React.MutableRefObject<FireworksSound | null>;

// gold, warm yellow, soft orange, champagne, white-hot (cores and crackle only)
const COLORS = ['255,196,84', '255,224,130', '255,146,52', '255,236,186', '255,250,232'];
const GOLD = 0, YELLOW = 1, ORANGE = 2, CHAMPAGNE = 3, WHITE = 4;
type Kind = 'peony' | 'chrysanthemum' | 'willow' | 'crackle' | 'ring' | 'palm' | 'double';

// Timings (seconds) and the burst mix for the whole hero. Phones fire more often: their black areas are small bands.
type Cfg = { first: number; rocket: [number, number]; salvo: number; cracker: [number, number]; sparkler: number; maxRockets: number; kinds: [Kind, number][] };
const KINDS: [Kind, number][] = [['peony', 3], ['chrysanthemum', 3], ['willow', 3], ['crackle', 3], ['ring', 2], ['palm', 2], ['double', 3]];
const CFG: Cfg = { first: 2, rocket: [0.45, 1.3], salvo: 0.35, cracker: [4, 9], sparkler: 5, maxRockets: 5, kinds: KINDS };
const CFG_PHONE: Cfg = { first: 1.4, rocket: [0.28, 0.7], salvo: 0.5, cracker: [3, 6], sparkler: 4, maxRockets: 7, kinds: KINDS };
// The photo frame at the top of the scroll (.hero-photo clip-path insets in app/globals.css: top, side, bottom).
const FRAME = { desktop: [0.15, 0.27, 0.18], phone: [0.3, 0.06, 0.34] };

// particle flags
const TWINKLE = 1, TRAIL = 2, BRANCH = 4, GLOW = 8;
type P = { x: number; y: number; px: number; py: number; vx: number; vy: number; age: number; life: number; c: number; w: number; drag: number; g: number; f: number; ct: number };
type Rocket = { x: number; y: number; vx: number; vy: number; g: number; r: number; kind: Kind; acc: number };
type Flash = { x: number; y: number; r: number; age: number; life: number; a: number; c: number };
type Sparkler = { side: FwSide; age: number; dur: number; cx: number; cy: number; ax: number; ay: number; sp: number; ph: number; hx: number; hy: number; hist: number[]; acc: number; ping: number };
type Box = { l: number; t: number; r: number; b: number };

const R = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const pickColor = () => { const n = Math.random(); return n < 0.36 ? GOLD : n < 0.66 ? YELLOW : n < 0.82 ? CHAMPAGNE : ORANGE; };
const inside = (b: Box, x: number, y: number) => x > b.l && x < b.r && y > b.t && y < b.b;
const dist = (b: Box, x: number, y: number) => Math.hypot(Math.max(b.l - x, 0, x - b.r), Math.max(b.t - y, 0, y - b.b));

/** Soft round glow, pre-rendered once per colour (drawImage is far cheaper than shadowBlur). */
function sprite(rgb: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.12, `rgba(${rgb},0.95)`);
  grad.addColorStop(0.4, `rgba(${rgb},0.3)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

export function FireworksCanvas({ sound }: { sound?: SoundRef }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    // the parent is the hero's sticky stage: it holds the copy we keep clear of, and sets data-past once the photo opens
    const stage = cv?.parentElement;
    if (!cv || !ctx || !stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const phone = window.matchMedia('(max-width: 767px)');
    let cfg = phone.matches ? CFG_PHONE : CFG;
    const sprites = COLORS.map(sprite);
    const kindTotal = cfg.kinds.reduce((s, [, n]) => s + n, 0);
    const emit = (e: FwSound) => sound?.current?.play(e);
    // the sound engine pans by side, with x (0–1) across that half of the hero
    const sideOf = (x: number): FwSide => (x < w / 2 ? 'left' : 'right');
    const at = (x: number) => (x < w / 2 ? x / (w / 2) : (x - w / 2) / (w / 2));

    let w = 0, h = 0, k = 1, lw = 1, S = 300, area = 1;
    let boxes: Box[] = [], diyas: Box[] = [], photoBox: Box = { l: 0, t: 0, r: 0, b: 0 }, measuredAt = -9;
    const parts: P[] = [], rockets: Rocket[] = [], flashes: Flash[] = [], timers: { at: number; fn: () => void }[] = [];
    let t = 0, idle = 0;
    let nextRocket = cfg.first, nextCracker = cfg.first + R(...cfg.cracker) * 0.5, nextSpark = cfg.sparkler;
    let spark: Sparkler | null = null, lowNext = false;

    /** Keep-out boxes (canvas coordinates) around everything the fireworks must not sit behind. */
    const measure = () => {
      measuredAt = t;
      const c = cv.getBoundingClientRect(), list: Box[] = [], soft: Box[] = [];
      const add = (to: Box[], r: DOMRect, pad: number) => {
        if (r.width > 0 && r.height > 0) to.push({ l: r.left - c.left - pad, t: r.top - c.top - pad, r: r.right - c.left + pad, b: r.bottom - c.top + pad });
      };
      const pad = phone.matches ? 10 : 16; // phones: a tighter berth, as their black areas are small
      const header = document.querySelector('header');
      if (header) list.push({ l: -1e4, t: -1e4, r: 1e4, b: header.getBoundingClientRect().bottom - c.top + 14 });
      // text: one box per line/word, so the space beside a short line stays usable
      stage.querySelectorAll('.hero-copy h1, .hero-copy p, .hero-copy dl').forEach((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        for (const r of range.getClientRects()) add(list, r, pad);
      });
      stage.querySelectorAll('.hero-copy a, .dw-sound, .hero-scroll').forEach((el) => add(list, el.getBoundingClientRect(), pad));
      // floating site buttons (WhatsApp) sit over the hero; keep bursts from showing behind them
      document.querySelectorAll('[data-testid="whatsapp-button"]').forEach((el) => add(list, el.getBoundingClientRect(), 20));
      stage.querySelectorAll('.dw-diya').forEach((el) => add(soft, el.getBoundingClientRect(), 22));
      // the photo frame (it opens up as you scroll: --s). Bursts stay off it; rockets may climb behind it, hidden.
      const [ft, fs, fb] = phone.matches ? FRAME.phone : FRAME.desktop, o = 1 - (parseFloat(stage.style.getPropertyValue('--s')) || 0);
      photoBox = { l: w * fs * o - 6, t: h * ft * o - 6, r: w * (1 - fs * o) + 6, b: h * (1 - fb * o) + 6 };
      boxes = list; diyas = soft;
    };
    /** How big a firework centred here can be without reaching any content or the canvas edge. */
    const room = (x: number, y: number) => {
      // phones: bursts may run a little off the screen's sides and bottom, so the narrow bands still get big ones
      const e = phone.matches ? 1.5 : 1;
      let m = Math.min((x + 6) * e, (w - x + 6) * e, y, (h - y) * e, dist(photoBox, x, y));
      for (const b of boxes) m = Math.min(m, dist(b, x, y));
      return m;
    };
    /** A random spot for something of radius `want` (or the roomiest spot found, if at least `min`). */
    const place = (want: number, min: number) => {
      let best: { x: number; y: number; r: number } | null = null;
      // phones: alternate between the band above the photo and the gaps around the buttons and stats below it
      const low = phone.matches && (lowNext = !lowNext);
      for (let i = 0; i < 48; i++) {
        const x = R(0.05, 0.95) * w, y = (low && i < 32 ? R(0.66, 0.99) : R(0.03, 0.97)) * h;
        if (diyas.some((b) => inside(b, x, y))) continue;
        const m = room(x, y);
        if (m >= want) return { x, y, r: want };
        if (!best || m > best.r) best = { x, y, r: m };
      }
      return best && best.r >= min ? best : null;
    };
    /** Clear distance straight down from a point (for a rocket's climb), keeping a berth either side of the trail. */
    const below = (x: number, y: number) => {
      const m = 24 * Math.max(k, 0.6);
      let yy = y;
      while (yy < h && yy - y < h * 0.42 && !boxes.some((b) => inside(b, x - m, yy) || inside(b, x, yy) || inside(b, x + m, yy))) yy += 6;
      return Math.min(yy, h) - y;
    };

    const cap = () => 1800 * clamp((w * h) / (390 * 900), 0.3, 2.2);
    const spawn = (x: number, y: number, vx: number, vy: number, life: number, c: number, w: number, drag: number, g: number, f = 0, ct = 0) => {
      parts.push({ x, y, px: x, py: y, vx, vy, age: 0, life, c, w, drag, g, f, ct });
    };
    const pickKind = (): Kind => {
      let n = Math.random() * kindTotal;
      for (const [kind, wt] of cfg.kinds) if ((n -= wt) < 0) return kind;
      return 'peony';
    };
    // small, medium or large
    const pickSize = () => {
      const n = Math.random();
      if (phone.matches) return S * (n < 0.5 ? R(0.24, 0.32) : R(0.36, 0.46)); // phones: medium and large only
      return S * (n < 0.3 ? R(0.13, 0.18) : n < 0.72 ? R(0.22, 0.3) : R(0.34, 0.42));
    };

    const burst = (x: number, y: number, r: number, kind: Kind) => {
      const c1 = pickColor(), c2 = Math.random() < 0.4 ? pickColor() : c1;
      const size = clamp(r / (S * 0.42), 0, 1);
      // phones: denser shells and a brighter flash, so the smaller bursts read as clearly as on desktop
      const n = Math.round(clamp(r * 0.95, 36, 150) * clamp(area, 0.6, 1) * (phone.matches ? 1.35 : 1));
      flashes.push({ x, y, r: r * 1.25, age: 0, life: 0.32, a: (0.32 + size * 0.28) * (phone.matches ? 1.3 : 1), c: YELLOW });
      flashes.push({ x, y, r: Math.max(10, r * 0.14), age: 0, life: 0.1, a: 0.55, c: WHITE });
      // Directions on a sphere, projected flat: denser in the middle like a real shell.
      const sphere = (count: number, reach: number, drag: number, fn: (vx: number, vy: number, i: number) => void) => {
        for (let i = 0; i < count; i++) {
          const u = R(-1, 1), th = R(0, Math.PI * 2), s = reach * drag * Math.sqrt(1 - u * u) * R(0.92, 1.04);
          fn(Math.cos(th) * s, Math.sin(th) * s, i);
        }
      };
      const g = 38 * k;
      if (kind === 'peony') {
        sphere(n, r, 2.6, (vx, vy, i) => spawn(x, y, vx, vy, R(1.3, 1.9), i % 2 ? c2 : c1, 2.2, 2.6, g, GLOW | (Math.random() < 0.4 ? TWINKLE : 0)));
      } else if (kind === 'chrysanthemum') {
        // stars that leave sparkling gold trails behind them
        sphere(Math.round(n * 0.8), r, 2.6, (vx, vy) => spawn(x, y, vx, vy, R(1.5, 2.1), c1, 2, 2.6, g, GLOW | TRAIL));
      } else if (kind === 'willow') {
        // long-burning gold that droops and falls
        sphere(Math.round(n * 0.75), r * 0.8, 2.1, (vx, vy) => spawn(x, y, vx, vy, R(2.6, 3.4), Math.random() < 0.6 ? GOLD : ORANGE, 1.8, 2.1, g * 0.75, GLOW | TRAIL | TWINKLE));
      } else if (kind === 'crackle') {
        // each star crackles out at its own moment between ~0.6s and ~1.6s (the crackle sound covers the same span)
        // crisp sparks, no glow halo: a dense shell of halos would blur into a white clump
        sphere(n, r, 2.6, (vx, vy, i) => { const life = R(1, 1.6); spawn(x, y, vx, vy, life, i % 3 ? CHAMPAGNE : GOLD, 2, 2.6, g, 0, life * R(0.62, 0.98)); });
        timers.push({ at: t + 0.6, fn: () => emit({ type: 'crackle', side: sideOf(x), x: at(x), size }) });
      } else if (kind === 'ring') {
        const tilt = R(0.5, 0.95), rot = R(0, Math.PI);
        for (const [ring, c] of Math.random() < 0.5 ? [[1, c1], [0.55, YELLOW]] : [[1, c1]]) {
          const m = Math.round(clamp(r * 0.5, 28, 64) * ring);
          for (let i = 0; i < m; i++) {
            const th = (i / m) * Math.PI * 2, s = r * ring * 2.5 * R(0.97, 1.02);
            const ax = Math.cos(th) * s, ay = Math.sin(th) * s * tilt;
            spawn(x, y, ax * Math.cos(rot) - ay * Math.sin(rot), ax * Math.sin(rot) + ay * Math.cos(rot), R(1.3, 1.6), c, 2.2, 2.5, g, GLOW);
          }
        }
      } else if (kind === 'palm') {
        const arms = 7 + Math.floor(Math.random() * 3), base = R(0, Math.PI * 2);
        for (let a = 0; a < arms; a++) {
          const th = base + (a / arms) * Math.PI * 2 + R(-0.15, 0.15);
          for (let j = 0; j < 6; j++) {
            const s = r * 2.3 * (1 - j * 0.06) * R(0.95, 1.03);
            spawn(x, y, Math.cos(th) * s, Math.sin(th) * s, R(1.7, 2.2), j ? ORANGE : GOLD, j ? 1.6 : 2.8, 2.3, g * 1.3, j ? GLOW | TWINKLE : GLOW | TRAIL);
          }
        }
      } else {
        // two shells in one: a warm yellow core inside a gold outer sphere
        sphere(Math.round(n * 0.4), r * 0.5, 2.6, (vx, vy) => spawn(x, y, vx, vy, R(1.1, 1.5), YELLOW, 1.9, 2.6, g, GLOW));
        sphere(Math.round(n * 0.75), r, 2.6, (vx, vy) => spawn(x, y, vx, vy, R(1.4, 1.9), c1 === YELLOW ? GOLD : c1, 2.2, 2.6, g, GLOW | TWINKLE));
      }
      emit({ type: 'burst', side: sideOf(x), x: at(x), size });
    };

    const launch = () => {
      if (w < 40 || h < 40 || rockets.length >= cfg.maxRockets) return;
      const kind = pickKind();
      const spot = place(pickSize() * (kind === 'willow' ? 1.15 : 1), 22 * k);
      if (!spot) return;
      const r = spot.r * (kind === 'willow' ? 0.85 : 0.92);
      const rise = below(spot.x, spot.y);
      if (rise < 70 * k) { burst(spot.x, spot.y, r, kind); return; }
      const x0 = spot.x + R(-0.04, 0.04) * rise, y0 = spot.y + rise;
      const g = Math.max(180, rise * 2.2), vy = -Math.sqrt(2 * g * rise), dur = -vy / g;
      rockets.push({ x: x0, y: y0, vx: (spot.x - x0) / dur, vy, g, r, kind, acc: 0 });
      emit({ type: 'launch', side: sideOf(x0), x: at(x0), dur });
    };

    // a ground spark burst (anar-style), sometimes a short chain (ladi) of them
    const cracker = (x: number, y: number, reach: number) => {
      flashes.push({ x, y, r: reach * 0.7, age: 0, life: 0.2, a: 0.55, c: YELLOW });
      const n = Math.round(clamp(reach * 0.5, 14, 34));
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + R(-0.75, 0.75), s = Math.sqrt(2 * 420 * k * reach) * R(0.6, 1);
        spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, R(0.4, 0.8), Math.random() < 0.5 ? YELLOW : ORANGE, 1.8, 1.2, 420 * k, TWINKLE);
      }
      emit({ type: 'pop', side: sideOf(x), x: at(x) });
    };
    const crackers = () => {
      const spot = place(60 * k, 34 * k);
      if (!spot) return;
      const count = Math.random() < 0.45 ? 3 + Math.floor(Math.random() * 3) : 1;
      const y = spot.y + spot.r * 0.55, dir = spot.x > w / 2 ? -1 : 1;
      let at = t;
      for (let i = 0; i < count; i++) {
        const x = clamp(spot.x + dir * (i - count / 2) * spot.r * 0.3, 6, w - 6);
        timers.push({ at, fn: () => cracker(x, y, spot.r * 0.9) });
        at += R(0.07, 0.16);
      }
    };

    const startSparkler = () => {
      const spot = place(80 * k, 50 * k);
      if (!spot) { nextSpark = t + 4; return; }
      spark = {
        side: sideOf(spot.x), age: 0, dur: R(7, 11), cx: spot.x, cy: spot.y, ax: spot.r * 0.5, ay: spot.r * 0.25,
        sp: R(1.1, 1.6), ph: R(0, 6), hx: spot.x, hy: spot.y, hist: [], acc: 0, ping: 0,
      };
    };
    const stopSparkler = () => {
      if (spark) emit({ type: 'fizz', side: spark.side, x: at(spark.cx), on: false });
      spark = null;
    };

    const schedule = () => {
      if (t - measuredAt > 1.2) measure(); // the headline animates in and fonts settle, so re-measure now and then
      if (t >= nextRocket) {
        launch();
        if (Math.random() < cfg.salvo) for (let i = 1, m = Math.random() < 0.4 ? 2 : 1; i <= m; i++) timers.push({ at: t + i * R(0.2, 0.5), fn: launch });
        nextRocket = t + R(...cfg.rocket);
      }
      if (t >= nextCracker) { crackers(); nextCracker = t + R(...cfg.cracker); }
      if (!spark && t >= nextSpark) startSparkler();
      for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= t) timers.splice(i, 1)[0].fn();
    };

    const update = (dt: number) => {
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.vy += r.g * dt; r.x += r.vx * dt; r.y += r.vy * dt;
        for (r.acc += dt * 90; r.acc >= 1; r.acc--) spawn(r.x, r.y, R(-18, 18) * k, R(15, 50) * k, R(0.3, 0.6), Math.random() < 0.6 ? GOLD : ORANGE, 1.3, 3, 70 * k, TWINKLE);
        if (r.vy >= -25 * k) { burst(r.x, r.y, r.r, r.kind); rockets.splice(i, 1); }
      }
      if (spark) {
        const s = spark;
        s.age += dt;
        const on = clamp(Math.min(s.age / 0.6, (s.dur - s.age) / 0.8), 0, 1);
        const a = s.age * s.sp + s.ph;
        s.hx = s.cx + s.ax * Math.sin(a); s.hy = s.cy + s.ay * Math.sin(2 * a); // a slow figure-eight, like a hand waving it
        s.hist.push(s.hx, s.hy);
        if (s.hist.length > 32) s.hist.splice(0, 2);
        // re-announced every half second so the fizz also starts if sound is switched on mid-sparkler
        if ((s.ping -= dt) <= 0) { s.ping = 0.5; emit({ type: 'fizz', side: s.side, x: at(s.cx), on: true }); }
        for (s.acc += dt * 140 * on; s.acc >= 1; s.acc--) {
          const ang = R(0, Math.PI * 2), sp = R(80, 260) * k;
          spawn(s.hx, s.hy, Math.cos(ang) * sp, Math.sin(ang) * sp, R(0.12, 0.38), Math.random() < 0.6 ? WHITE : YELLOW, 1.1, 4.2, 90 * k, BRANCH | (Math.random() < 0.4 ? TWINKLE : 0));
        }
        if (s.age >= s.dur) { stopSparkler(); nextSpark = t + R(9, 18); }
      }
      const max = cap();
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) {
          // sparkler sparks fork as they die
          if (p.f & BRANCH && Math.random() < 0.35) for (let j = 0, n = 2 + (Math.random() < 0.5 ? 1 : 0); j < n; j++) {
            const ang = R(0, Math.PI * 2), sp = R(40, 110) * k;
            spawn(p.x, p.y, Math.cos(ang) * sp, Math.sin(ang) * sp, R(0.05, 0.14), WHITE, 0.9, 5, 60 * k);
          }
          parts[i] = parts[parts.length - 1];
          parts.pop();
          continue;
        }
        const dr = Math.exp(-p.drag * dt);
        p.px = p.x; p.py = p.y;
        p.vx *= dr; p.vy = p.vy * dr + p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        // glitter left behind: the sparkling trail that hangs and falls
        if (p.f & TRAIL && parts.length < max && Math.random() < dt * 34) spawn(p.x, p.y, p.vx * 0.05 + R(-6, 6), p.vy * 0.05, R(0.5, 1.1), Math.random() < 0.7 ? p.c : CHAMPAGNE, 1.1, 2, 30 * k, TWINKLE);
        if (p.ct && p.age > p.ct) {
          // crackle: the star snaps into a short white strobe
          p.ct = 0; p.age = p.life;
          if (Math.random() < 0.85) spawn(p.x + R(-3, 3), p.y + R(-3, 3), 0, 0, R(0.06, 0.14), Math.random() < 0.5 ? WHITE : CHAMPAGNE, 1.8, 0, 0, TWINKLE);
        }
      }
      for (let i = flashes.length - 1; i >= 0; i--) if ((flashes[i].age += dt) >= flashes[i].life) flashes.splice(i, 1);
    };

    const draw = (dt: number) => {
      const empty = !parts.length && !rockets.length && !flashes.length && !spark;
      idle = empty ? idle + 1 : 0;
      if (idle > 40) { if (idle === 41) ctx.clearRect(0, 0, w, h); return; }
      // fade the previous frame instead of clearing it: that leaves the glowing trails
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(0,0,0,${1 - Math.pow(0.84, dt * 60)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const f of flashes) {
        const q = 1 - f.age / f.life;
        ctx.globalAlpha = f.a * q * q;
        ctx.drawImage(sprites[f.c], f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      }
      for (const r of rockets) {
        const s = 7 * Math.max(k, 0.7);
        ctx.globalAlpha = 1;
        ctx.drawImage(sprites[YELLOW], r.x - s, r.y - s, s * 2, s * 2);
      }
      let lc = -1;
      for (const p of parts) {
        const life = p.age / p.life;
        let a = life < 0.55 ? 1 : Math.max(0, 1 - (life - 0.55) / 0.45);
        if (p.f & TWINKLE) a *= 0.4 + Math.random() * 0.6;
        if (p.c !== lc) { ctx.strokeStyle = `rgb(${COLORS[p.c]})`; lc = p.c; }
        ctx.globalAlpha = a;
        ctx.lineWidth = p.w * lw;
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
        if (p.f & GLOW && a > 0.15) {
          const s = p.w * 3.6 * lw;
          ctx.globalAlpha = a * 0.6;
          ctx.drawImage(sprites[p.c], p.x - s, p.y - s, s * 2, s * 2);
        }
      }
      if (spark) {
        const s = spark, on = clamp(Math.min(s.age / 0.6, (s.dur - s.age) / 0.8), 0, 1);
        // the wire, from the hand to the burning tip
        ctx.globalAlpha = 0.25 * on;
        ctx.strokeStyle = `rgb(${COLORS[ORANGE]})`;
        ctx.lineWidth = 1.3 * lw;
        ctx.beginPath(); ctx.moveTo(s.cx + 6 * k, s.cy + s.ay + 46 * k); ctx.lineTo(s.hx, s.hy); ctx.stroke();
        // the tip's glowing trail
        ctx.strokeStyle = `rgb(${COLORS[GOLD]})`;
        const n = s.hist.length / 2;
        for (let i = 1; i < n; i++) {
          ctx.globalAlpha = (i / n) * 0.7 * on;
          ctx.lineWidth = (0.8 + (2.6 * i) / n) * lw;
          ctx.beginPath(); ctx.moveTo(s.hist[i * 2 - 2], s.hist[i * 2 - 1]); ctx.lineTo(s.hist[i * 2], s.hist[i * 2 + 1]); ctx.stroke();
        }
        const hs = (12 + Math.random() * 5) * Math.max(k, 0.7) * on;
        ctx.globalAlpha = 1;
        ctx.drawImage(sprites[WHITE], s.hx - hs, s.hy - hs, hs * 2, hs * 2);
      }
    };

    const resize = () => {
      cfg = phone.matches ? CFG_PHONE : CFG;
      w = cv.clientWidth; h = cv.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      S = Math.min(w, h * 0.7); // the size a "large" firework is measured against
      k = clamp(S / 360, 0.45, 1.15);
      lw = clamp(k, 0.75, 1.1);
      area = clamp((w * h) / (390 * 900), 0.3, 1);
      if (spark) stopSparkler();
      measure();
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
      else { cancelAnimationFrame(raf); if (spark) emit({ type: 'fizz', side: spark.side, x: at(spark.cx), on: false }); }
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); });
    io.observe(cv);
    const mo = new MutationObserver(() => { past = stage.dataset.past === '1'; sync(); });
    mo.observe(stage, { attributes: true, attributeFilter: ['data-past'] });
    document.addEventListener('visibilitychange', sync);
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      stopSparkler();
      io.disconnect(); mo.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [sound]);

  return <canvas ref={ref} className="dw-fw" aria-hidden />;
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

/** Small floating speaker button in the hero's black area; fades out with the decor as you scroll. */
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
