/**
 * Diwali decorations for the black side areas of the home hero (components/hero-reveal.tsx).
 * Purely decorative: aria-hidden, pointer-events: none, sits behind the hero copy. Styles: .dw-* in app/globals.css.
 * Items are placed with --x/--y (0–1) inside their side box, so they never leave it; --sz is the base size in px.
 */
import type React from 'react';

type Side = 'left' | 'right';
type Pt = { x: number; y: number; sz: number; d?: number; m?: boolean };

const vars = (p: Pt) => ({ '--x': p.x, '--y': p.y, '--b': `${p.sz}px`, '--d': `${p.d ?? 0}s` }) as React.CSSProperties;

// Left: three diyas stepping down the side; right: a light string with two diyas, so the sides balance without mirroring.
const LAYOUT: Record<Side, { diyas: Pt[]; glows: Pt[]; sparkles: Pt[]; particles: number[] }> = {
  left: {
    diyas: [{ x: 0.66, y: 0.02, sz: 58, d: 0 }, { x: 0.14, y: 0.46, sz: 78, d: 0.7 }, { x: 0.74, y: 1, sz: 46, d: 1.3 }],
    glows: [{ x: 0.12, y: 0.42, sz: 190 }, { x: 0.78, y: 0.05, sz: 140 }, { x: 0.8, y: 1, sz: 120 }],
    sparkles: [{ x: 0.36, y: 0.08, sz: 11, d: 0 }, { x: 0.94, y: 0.4, sz: 8, d: 1.6 }, { x: 0.04, y: 0.92, sz: 12, d: 2.8 }, { x: 0.5, y: 0.66, sz: 7, d: 0.9 }, { x: 0.2, y: 0.2, sz: 6, d: 3.6 }],
    particles: [0.08, 0.22, 0.38, 0.52, 0.68, 0.84, 0.95],
  },
  right: {
    diyas: [{ x: 0.3, y: 0.62, sz: 84, d: 0.4, m: true }, { x: 0.82, y: 1, sz: 50, d: 1.1, m: true }],
    glows: [{ x: 0.28, y: 0.6, sz: 210, m: true }, { x: 0.86, y: 1, sz: 130 }],
    sparkles: [{ x: 0.7, y: 0.36, sz: 10, d: 0.5, m: true }, { x: 0.08, y: 0.3, sz: 8, d: 2.1 }, { x: 0.96, y: 0.7, sz: 12, d: 3.2 }, { x: 0.5, y: 0.94, sz: 7, d: 1.4, m: true }, { x: 0.12, y: 1, sz: 9, d: 4 }],
    particles: [0.06, 0.2, 0.34, 0.5, 0.64, 0.78, 0.92],
  },
};
const BULBS = [0.04, 0.17, 0.3, 0.43, 0.56, 0.69, 0.82, 0.95];

/** A clay diya: footed bowl with a petal band, oil, a wick and a layered flame. Gradients come from <DiwaliDefs />. */
export function Diya({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`dw-diya ${className ?? ''}`} style={style}>
      <span className="dw-diya-halo" />
      <svg viewBox="0 0 100 100" fill="none">
        <g className="dw-flame">
          <path d="M50 6c7 11 13 20 13 30a13 13 0 0 1-26 0c0-10 6-19 13-30z" fill="url(#dw-flame-outer)" opacity="0.92" />
          <path className="dw-flame-inner" d="M50 20c4 6.5 7.4 12 7.4 18a7.4 7.4 0 0 1-14.8 0c0-6 3.4-11.5 7.4-18z" fill="url(#dw-flame-inner)" />
          <ellipse cx="50" cy="44" rx="2.6" ry="3.6" fill="#FFF8E7" opacity="0.95" />
        </g>
        <path d="M50 46v6" stroke="#2B1A0A" strokeWidth="2" strokeLinecap="round" />
        {/* foot */}
        <path d="M40 74h20l4 8H36z" fill="url(#dw-bowl)" />
        <path d="M36 82h28" stroke="#F5D98B" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round" />
        {/* bowl */}
        <path d="M12 54c2 13 17 22 38 22s36-9 38-22z" fill="url(#dw-bowl)" />
        <path d="M18 62c6 2 12 3 16 3M66 65c4 0 10-1 16-3" stroke="#FFE7B0" strokeOpacity="0.35" strokeWidth="1.4" strokeLinecap="round" />
        {/* petal band + dots */}
        <path d="M22 60q4 6 8 0q4 6 8 0q4 6 8 0q4 6 8 0q4 6 8 0q4 6 8 0q4 6 8 0" stroke="#F5D98B" strokeOpacity="0.7" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M30 70h40" stroke="#F5D98B" strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="0.1 4" />
        {/* rim and oil */}
        <ellipse cx="50" cy="54" rx="38" ry="6.5" fill="url(#dw-rim)" />
        <ellipse cx="50" cy="54" rx="31" ry="4" fill="url(#dw-oil)" />
        <ellipse cx="44" cy="53.2" rx="10" ry="1.1" fill="#FFF4D6" opacity="0.35" />
      </svg>
    </span>
  );
}

/** Shared gradients for every diya on the page (rendered once, zero-size but not display:none so the ids resolve). */
function DiwaliDefs() {
  return (
    <svg width="0" height="0" className="absolute" focusable="false">
      <defs>
        <linearGradient id="dw-flame-outer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD27A" stopOpacity="0.2" />
          <stop offset="35%" stopColor="#FFB547" />
          <stop offset="100%" stopColor="#E8742A" />
        </linearGradient>
        <linearGradient id="dw-flame-inner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF4D6" />
          <stop offset="100%" stopColor="#FFD98A" />
        </linearGradient>
        <linearGradient id="dw-bowl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D6B36A" />
          <stop offset="55%" stopColor="#9C6B2E" />
          <stop offset="100%" stopColor="#4A2C12" />
        </linearGradient>
        <linearGradient id="dw-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8A6230" />
          <stop offset="45%" stopColor="#F5D98B" />
          <stop offset="100%" stopColor="#8A6230" />
        </linearGradient>
        <radialGradient id="dw-oil" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#C98A2E" />
          <stop offset="100%" stopColor="#5A3412" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function DiwaliSide({ side }: { side: Side }) {
  const l = LAYOUT[side];
  const m = (p: Pt) => (p.m ? ' dw-m' : '');
  return (
    <div className={`dw-side dw-${side}`}>
      {l.glows.map((p, i) => <span key={`g${i}`} className={`dw-item dw-glow${m(p)}`} style={vars(p)} />)}
      {side === 'right' && (
        <div className="dw-string">
          <svg viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M0 1Q50 34 100 1" fill="none" stroke="#D6B36A" strokeOpacity="0.45" strokeWidth="1" vectorEffect="non-scaling-stroke" /></svg>
          {BULBS.map((x, i) => (
            <span key={i} className="dw-bulb" style={{ left: `${x * 100}%`, '--sag': (1 - (2 * x - 1) ** 2).toFixed(3), '--d': `${(i * 0.53) % 2.4}s` } as React.CSSProperties} />
          ))}
        </div>
      )}
      {l.particles.map((x, i) => (
        <span key={`p${i}`} className={`dw-particle${i % 2 ? '' : ' dw-m'}`} style={{ left: `${x * 100}%`, '--d': `${(i * 1.7) % 7}s`, '--t': `${8 + (i % 3) * 2.5}s`, '--dx': `${i % 2 ? 14 : -12}px` } as React.CSSProperties} />
      ))}
      {l.sparkles.map((p, i) => (
        <svg key={`s${i}`} className={`dw-item dw-sparkle${m(p)}`} style={vars(p)} viewBox="0 0 20 20"><path d="M10 0c.8 6 3.2 8.6 10 10-6.8 1.4-9.2 4-10 10-.8-6-3.2-8.6-10-10 6.8-1.4 9.2-4 10-10z" fill="#F5D98B" /></svg>
      ))}
      {l.diyas.map((p, i) => <Diya key={`d${i}`} className={`dw-item${m(p)}`} style={vars(p)} />)}
    </div>
  );
}

/** Both side decorations for the hero. Place it between the photo and the copy layers. */
export function DiwaliDecor() {
  return (
    <div className="dw" aria-hidden>
      <DiwaliDefs />
      <DiwaliSide side="left" />
      <DiwaliSide side="right" />
    </div>
  );
}
