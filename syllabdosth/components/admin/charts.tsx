/** Tiny SVG charts (no library). */

function smooth(points: [number, number][]) {
  if (points.length < 2) return '';
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

/** Sparkline with a soft gradient fill, like the stat cards on the old dashboard. */
export function Sparkline({ data, color, id, width = 220, height = 76 }: { data: number[]; color: string; id: string; width?: number; height?: number }) {
  const max = Math.max(1, ...data);
  const pad = 4;
  const pts: [number, number][] = data.map((v, i) => [pad + (i * (width - pad * 2)) / Math.max(1, data.length - 1), height - pad - (v / max) * (height - pad * 2)]);
  const line = smooth(pts);
  const area = `${line} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`g-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Grouped bar chart with a legend (e.g. students / enquiries / bookings per day). */
export function BarChart({ labels, series, height = 280 }: { labels: string[]; series: { name: string; color: string; values: number[] }[]; height?: number }) {
  const W = 760, H = height, left = 34, bottom = 28, top = 10, right = 8;
  const max = Math.max(4, ...series.flatMap((s) => s.values));
  const step = Math.ceil(max / 5);
  const yMax = step * 5;
  const plotW = W - left - right, plotH = H - top - bottom;
  const band = plotW / Math.max(1, labels.length);
  const barW = Math.min(12, (band * 0.6) / series.length);
  const y = (v: number) => top + plotH - (v / yMax) * plotH;
  const everyNth = labels.length > 14 ? Math.ceil(labels.length / 10) : 1;
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4">
        {series.map((s) => <span key={s.name} className="flex items-center gap-2 text-[12px] text-adm-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.name}</span>)}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Chart: ${series.map((s) => `${s.name} ${s.values.reduce((a, b) => a + b, 0)}`).join(', ')}`}>
        {Array.from({ length: 6 }, (_, i) => i * step).map((v) => (
          <g key={v}>
            <line x1={left} x2={W - right} y1={y(v)} y2={y(v)} stroke="#E5E7EB" strokeDasharray="4 4" />
            <text x={left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6B7280">{v}</text>
          </g>
        ))}
        {labels.map((l, i) => {
          const cx = left + band * i + band / 2;
          const groupW = barW * series.length + 2 * (series.length - 1);
          return (
            <g key={i}>
              {series.map((s, k) => {
                const v = s.values[i] ?? 0;
                const x = cx - groupW / 2 + k * (barW + 2);
                return v > 0 ? <rect key={s.name} x={x} y={y(v)} width={barW} height={Math.max(2, top + plotH - y(v))} rx={barW / 2} fill={s.color}><title>{`${s.name}: ${v}`}</title></rect> : null;
              })}
              {i % everyNth === 0 && <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill="#6B7280">{l}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
