import { useState } from "react";

const short = (n) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1).replace(/\.0$/, "")} M`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")} jt`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} rb`;
  return String(n);
};

/** Simple bar chart in plain SVG. `data` is [{ label, value, title }]. */
export default function BarChart({ data, height = 220, format = (v) => v }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const top = niceCeil(max);
  const w = 600;
  const pad = { l: 44, r: 8, t: 12, b: 26 };
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const step = innerW / data.length;
  const barW = Math.min(36, step * 0.62);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);
  const active = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="Bar chart">
        {ticks.map((t) => {
          const y = pad.t + innerH - (t / top) * innerH;
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="var(--color-line)" strokeDasharray={t === 0 ? "" : "3 4"} />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--color-ink-soft)">
                {short(t)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.value / top) * innerH;
          const x = pad.l + i * step + (step - barW) / 2;
          const showLabel = data.length <= 12 || i % Math.ceil(data.length / 12) === 0;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * step} y={pad.t} width={step} height={innerH} fill="transparent" />
              <rect x={x} y={pad.t + innerH - h} width={barW} height={Math.max(h, d.value ? 2 : 0)} rx="4" fill={hover === i ? "var(--color-teak)" : "var(--color-moss)"} />
              {showLabel && (
                <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--color-ink-soft)">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {active && (
        <div className="pointer-events-none absolute top-0 right-0 rounded-lg bg-ink px-3 py-2 text-xs text-white">
          <p className="text-white/60">{active.title || active.label}</p>
          <p className="font-semibold">{format(active.value)}</p>
        </div>
      )}
    </div>
  );
}

function niceCeil(n) {
  const mag = 10 ** Math.floor(Math.log10(n));
  const f = n / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
}
