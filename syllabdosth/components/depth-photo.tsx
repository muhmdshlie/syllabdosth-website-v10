'use client';

/**
 * "3D photo": a WebGL shader shifts each pixel by its depth (from a depth map made with MiDaS),
 * so the people in the photo move against the backdrop as the pointer moves: real parallax
 * from a single still. Falls back to the plain <img> if WebGL is unavailable or motion is reduced.
 *
 * Props: src (HD photo), depth (greyscale depth map, white = near), focus (object-position, 0–1),
 * and strength of the effect.
 */
import { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  depth: string;
  alt: string;
  /** Which part of the photo stays in view when cropped, like object-position (0–1). */
  focus?: [number, number];
  /** Parallax strength in UV units. */
  strength?: number;
  className?: string;
};

const CENTER: [number, number] = [0.5, 0.5];

const VERT = `attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0.,1.);}`;
const FRAG = `precision mediump float;
varying vec2 v;uniform sampler2D img,dep;uniform vec2 cover,off,mouse,fc;uniform float strength,zoom;
void main(){
  vec2 uv=(v-fc)/zoom+fc;             // slight zoom, anchored where the photo is focused
  uv=uv*cover+off;                     // object-fit: cover + object-position
  float d=texture2D(dep,uv).r;
  vec2 shift=mouse*(d-.45)*strength;   // near pixels move one way, the backdrop the other
  // two-tap search keeps silhouettes clean instead of smearing
  float d2=texture2D(dep,uv-shift).r;
  vec2 uv2=uv-mouse*(d2-.45)*strength;
  gl_FragColor=texture2D(img,clamp(uv2,.001,.999));
}`;

export function DepthPhoto({ src, depth, alt, focus = CENTER, strength = 0.028, className = '' }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: false, alpha: false });
    if (!gl) return;

    const sh = (t: number, s: string) => { const o = gl.createShader(t)!; gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);

    const load = (url: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = url; });
    const tex = (im: HTMLImageElement, unit: number) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
    };

    let raf = 0, alive = true, iw = 1, ih = 1;
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    const fine = window.matchMedia('(pointer: fine)').matches;
    const t0 = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth, h = cv.clientHeight;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, cv.width, cv.height);
      // object-fit: cover → how much of the texture is visible, and where
      const ca = w / h, ia = iw / ih;
      const sx = ca > ia ? 1 : ca / ia, sy = ca > ia ? ia / ca : 1;
      gl.uniform2f(U('cover'), sx, sy);
      gl.uniform2f(U('off'), (1 - sx) * focus[0], (1 - sy) * focus[1]);
    };

    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const frame = (now: number) => {
      if (!alive) return;
      const t = (now - t0) / 1000;
      // touch screens (and idle desktops) get a slow automatic orbit so the depth is always visible
      const ax = Math.sin(t * 0.5) * 0.55, ay = Math.cos(t * 0.37) * 0.3;
      const tx = fine ? target.x * 0.85 + ax * 0.25 : ax, ty = fine ? target.y * 0.6 + ay * 0.25 : ay;
      cur.x += (tx - cur.x) * 0.06;
      cur.y += (ty - cur.y) * 0.06;
      gl.uniform2f(U('mouse'), cur.x, cur.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(frame);
    };

    // pause when off-screen
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      if (e.isIntersecting && alive) raf = requestAnimationFrame(frame);
    });

    Promise.all([load(src), load(depth)]).then(([im, dm]) => {
      if (!alive) return;
      iw = im.naturalWidth; ih = im.naturalHeight;
      tex(im, 0); tex(dm, 1);
      gl.uniform1i(U('img'), 0);
      gl.uniform1i(U('dep'), 1);
      gl.uniform1f(U('strength'), strength);
      gl.uniform1f(U('zoom'), 1.05);
      gl.uniform2f(U('fc'), focus[0], focus[1]); // hides the edges that parallax would reveal
      resize();
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      setReady(true);
      io.observe(cv);
      window.addEventListener('resize', resize);
      if (fine) window.addEventListener('pointermove', onMove, { passive: true });
    }).catch(() => {});

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, [src, depth, strength, focus[0], focus[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        fetchPriority="high"
        className="h-full w-full object-cover"
        style={{ objectPosition: `${focus[0] * 100}% ${focus[1] * 100}%` }}
      />
      <canvas
        ref={canvas}
        aria-hidden
        className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
