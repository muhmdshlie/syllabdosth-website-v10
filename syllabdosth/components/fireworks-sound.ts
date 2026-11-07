/**
 * Fireworks sounds for the hero Diwali decor (components/diwali-fireworks.tsx), synthesised with the Web Audio API:
 * no audio files to download or license. The AudioContext is only created from the sound toggle's click, so
 * nothing ever autoplays. A voice cap, per-sound gaps, a master gain and a compressor keep it from getting loud.
 */

export type FwSide = 'left' | 'right';
export type FwSound =
  | { type: 'launch'; side: FwSide; x: number; dur: number }
  | { type: 'burst' | 'crackle'; side: FwSide; x: number; size: number }
  | { type: 'pop'; side: FwSide; x: number }
  | { type: 'fizz'; side: FwSide; x: number; on: boolean };

const VOLUME = 0.55;
const MAX_VOICES = 6;
// Minimum seconds between two sounds of the same type, so salvos don't stack up.
const GAP: Record<string, number> = { launch: 0.35, burst: 0.2, crackle: 0.45, pop: 0.05 };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class FireworksSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private echo: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private enabled = false;
  private voices = 0;
  private last: Record<string, number> = {};
  private fizz = new Map<FwSide, { src: AudioBufferSourceNode; gain: GainNode }>();
  private suspendTimer = 0;

  /** Call from a click handler: browsers only allow audio to start from a user gesture. */
  setEnabled(on: boolean) {
    this.enabled = on;
    window.clearTimeout(this.suspendTimer);
    if (on) {
      if (!this.ctx) this.init();
      const { ctx, master } = this;
      if (!ctx || !master) return;
      void ctx.resume();
      master.gain.setTargetAtTime(VOLUME, ctx.currentTime, 0.05);
    } else if (this.ctx && this.master) {
      for (const side of [...this.fizz.keys()]) this.stopFizz(side);
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      const ctx = this.ctx;
      this.suspendTimer = window.setTimeout(() => { if (!this.enabled) void ctx.suspend(); }, 300);
    }
  }

  get supported() {
    return typeof window !== 'undefined' && !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
  }

  play(e: FwSound) {
    const ctx = this.ctx;
    if (!this.enabled || !ctx || ctx.state !== 'running') return;
    if (e.type === 'fizz') return e.on ? this.startFizz(e.side, e.x) : this.stopFizz(e.side);
    const now = ctx.currentTime;
    if (now - (this.last[e.type] ?? -9) < GAP[e.type] || this.voices >= MAX_VOICES) return;
    this.last[e.type] = now;
    const pan = this.pan(e.side, e.x);
    if (e.type === 'burst') this.boom(e.size, pan);
    else if (e.type === 'crackle') this.crackle(e.size, pan);
    else if (e.type === 'launch') this.launch(e.dur, pan);
    else this.pop(pan);
  }

  close() {
    window.clearTimeout(this.suspendTimer);
    for (const side of [...this.fizz.keys()]) this.stopFizz(side);
    void this.ctx?.close();
    this.ctx = this.master = this.echo = this.noise = null;
    this.enabled = false;
  }

  private init() {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.25;
    comp.connect(ctx.destination);
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(comp);
    // A short lowpassed echo, like a burst bouncing off nearby buildings.
    const echo = ctx.createGain(), delay = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter();
    echo.gain.value = 0.22; delay.delayTime.value = 0.23; fb.gain.value = 0.28; lp.type = 'lowpass'; lp.frequency.value = 1100;
    echo.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(master);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    Object.assign(this, { ctx, master, echo, noise });
  }

  /** Left side sounds come from the left, right from the right; never hard-panned. */
  private pan(side: FwSide, x: number) {
    return side === 'left' ? -0.6 + x * 0.25 : 0.35 + x * 0.25;
  }

  /** Output chain for one sound: gain → panner → master (+ optional echo send). Counts as one voice until `end`. */
  private out(pan: number, end: number, echo = 0) {
    const ctx = this.ctx!, g = ctx.createGain();
    let node: AudioNode = g;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    node.connect(this.master!);
    if (echo && this.echo) { const s = ctx.createGain(); s.gain.value = echo; node.connect(s); s.connect(this.echo); }
    this.voices++;
    window.setTimeout(() => { this.voices--; node.disconnect(); }, (end - ctx.currentTime) * 1000 + 100);
    return g;
  }

  private noiseSrc(rate = 1) {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise; s.playbackRate.value = rate;
    return s;
  }

  private boom(size: number, pan: number) {
    const ctx = this.ctx!, t = ctx.currentTime + 0.01, v = 0.55 + size * 0.45;
    const bus = this.out(pan, t + 2.2, 0.5);
    // low thump
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(rand(95, 120) * (1.15 - size * 0.3), t);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.4);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.9 * v, t + 0.006);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(og); og.connect(bus); o.start(t); o.stop(t + 0.75);
    // the blast: noise through a closing lowpass
    const n = this.noiseSrc(rand(0.8, 1.15)), lp = ctx.createBiquadFilter(), ng = ctx.createGain();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(220, t + 1.2);
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.75 * v, t + 0.008);
    ng.gain.setTargetAtTime(0.0001, t + 0.02, 0.28);
    n.connect(lp); lp.connect(ng); ng.connect(bus); n.start(t, rand(0, 0.5)); n.stop(t + 1.8);
    // sharp crack on top
    const c = this.noiseSrc(), hp = ctx.createBiquadFilter(), cg = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 1600;
    cg.gain.setValueAtTime(0.5 * v, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    c.connect(hp); hp.connect(cg); cg.connect(bus); c.start(t, rand(0, 1)); c.stop(t + 0.1);
  }

  /** Glitter crackle: dozens of tiny clicks, thinning out over ~1.3s. */
  private crackle(size: number, pan: number) {
    const ctx = this.ctx!, t0 = ctx.currentTime + 0.01, span = 1.1 + size * 0.4;
    const bus = this.out(pan, t0 + span + 0.3, 0.25);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = rand(2600, 4200); bp.Q.value = 0.7;
    bp.connect(bus);
    const count = Math.round(26 + size * 30);
    for (let i = 0; i < count; i++) {
      const t = t0 + span * Math.pow(Math.random(), 1.7), len = rand(0.004, 0.014);
      const s = this.noiseSrc(rand(0.7, 1.4)), g = ctx.createGain();
      g.gain.setValueAtTime(rand(0.12, 0.42), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      s.connect(g); g.connect(bp); s.start(t, rand(0, 1.9), len + 0.005);
    }
  }

  /** A small cracker going off on the ground: short bright pop with a little body. */
  private pop(pan: number) {
    const ctx = this.ctx!, t = ctx.currentTime + 0.005;
    const bus = this.out(pan, t + 0.5, 0.35);
    const n = this.noiseSrc(rand(0.9, 1.3)), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = rand(1400, 2400); bp.Q.value = 0.8;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.7, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.05, 0.09));
    n.connect(bp); bp.connect(g); g.connect(bus); n.start(t, rand(0, 1.8)); n.stop(t + 0.12);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.08);
    og.gain.setValueAtTime(0.35, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(og); og.connect(bus); o.start(t); o.stop(t + 0.12);
  }

  /** Rocket going up: a soft rising whoosh, sometimes with a faint whistle. */
  private launch(dur: number, pan: number) {
    const ctx = this.ctx!, t = ctx.currentTime + 0.01, d = Math.max(0.4, Math.min(dur, 1.8));
    const bus = this.out(pan, t + d + 0.2);
    const n = this.noiseSrc(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.exponentialRampToValueAtTime(2200, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    n.connect(bp); bp.connect(g); g.connect(bus); n.start(t, rand(0, 1)); n.stop(t + d + 0.05);
    if (Math.random() < 0.4) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime(rand(1300, 1600), t);
      o.frequency.exponentialRampToValueAtTime(rand(2400, 2900), t + d);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.025, t + 0.15);
      og.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(og); og.connect(bus); o.start(t); o.stop(t + d + 0.05);
    }
  }

  /** Sparkler: a quiet, continuous fizz while one is lit on that side. */
  private startFizz(side: FwSide, x: number) {
    if (this.fizz.has(side)) return;
    const ctx = this.ctx!, t = ctx.currentTime;
    const src = this.noiseSrc(), hp = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.loop = true;
    hp.type = 'highpass'; hp.frequency.value = 3200;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.setTargetAtTime(0.045, t, 0.3);
    let node: AudioNode = gain;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = this.pan(side, x); gain.connect(p); node = p; }
    node.connect(this.master!);
    src.connect(hp); hp.connect(gain); src.start(t, rand(0, 1.5));
    src.onended = () => node.disconnect();
    this.fizz.set(side, { src, gain });
  }

  private stopFizz(side: FwSide) {
    const f = this.fizz.get(side);
    if (!f || !this.ctx) return;
    this.fizz.delete(side);
    const t = this.ctx.currentTime;
    f.gain.gain.cancelScheduledValues(t);
    f.gain.gain.setTargetAtTime(0.0001, t, 0.12);
    f.src.stop(t + 0.6);
  }
}
