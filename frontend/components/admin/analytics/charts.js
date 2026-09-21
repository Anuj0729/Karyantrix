'use client';

import { useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

export const CHART_COLORS = [
  '#6366F1',
  '#10B981',
  '#F59E0B',
  '#F43F5E',
  '#0EA5E9',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#84CC16',
  '#F97316',
  '#64748B',
  '#A855F7',
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM' -> "Aug '26"   |   'YYYY-MM-DD' -> "12 Aug" */
export function formatBucketLabel(label = '') {
  const parts = String(label).split('-').map(Number);
  if (parts.length === 2) return `${MONTH_NAMES[parts[1] - 1]} '${String(parts[0]).slice(2)}`;
  if (parts.length === 3) return `${parts[2]} ${MONTH_NAMES[parts[1] - 1]}`;
  return String(label);
}

export function prettifyKey(key = '') {
  const text = String(key).replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/* ------------------------------------------------------------------ */
/* Filter controls                                                     */
/* ------------------------------------------------------------------ */

export function FilterField({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{label}</span>
      {children}
    </div>
  );
}

export function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div role="group" aria-label={ariaLabel} className="inline-flex rounded-xl bg-ink-100/80 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={`rounded-[10px] px-2.5 py-1 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
              active ? 'bg-white text-brand-700 shadow-xs' : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SelectControl({ value, onChange, options, ariaLabel }) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-ink-200/80 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 shadow-xs outline-none transition-colors hover:border-brand-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Multi-select pill chips; each chip carries the series colour. */
export function ChipToggleGroup({ options, selected, onToggle, ariaLabel }) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all active:scale-95 ${
              active
                ? 'border-transparent bg-ink-900 text-white shadow-xs'
                : 'border-ink-200/80 bg-white text-ink-500 hover:border-ink-300 hover:text-ink-800'
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: o.color, opacity: active ? 1 : 0.45 }}
              aria-hidden="true"
            />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function ChartEmpty({ message = 'No data for the selected filters.' }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50/50 text-xs font-medium text-ink-400">
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Line chart                                                          */
/* ------------------------------------------------------------------ */

const LW = 640;
const LH = 280;
const LPAD = { l: 38, r: 18, t: 16, b: 30 };

export function LineChart({ labels = [], series = [], colors = {}, formatLabel = formatBucketLabel }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const n = labels.length;
  const innerW = LW - LPAD.l - LPAD.r;
  const innerH = LH - LPAD.t - LPAD.b;
  const peak = Math.max(0, ...series.flatMap((s) => s.points));
  const yMax = Math.max(4, Math.ceil(peak / 4) * 4);
  const ticks = [0, 1, 2, 3, 4].map((i) => (yMax / 4) * i);

  const xAt = (i) => (n <= 1 ? LPAD.l + innerW / 2 : LPAD.l + (i / (n - 1)) * innerW);
  const yAt = (v) => LPAD.t + innerH - (v / yMax) * innerH;

  const linePath = (points) =>
    points
      .map((v, i) => {
        const x = xAt(i);
        const y = yAt(v);
        if (i === 0) return `M${x},${y}`;
        const px = xAt(i - 1);
        const py = yAt(points[i - 1]);
        const mx = (px + x) / 2;
        return `C${mx},${py} ${mx},${y} ${x},${y}`;
      })
      .join(' ');

  const areaPath = (points) =>
    `${linePath(points)} L${xAt(points.length - 1)},${yAt(0)} L${xAt(0)},${yAt(0)} Z`;

  const labelStep = Math.max(1, Math.ceil(n / 7));

  const onMove = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * LW;
    const idx = n <= 1 ? 0 : clamp(Math.round(((x - LPAD.l) / innerW) * (n - 1)), 0, n - 1);
    setHover(idx);
  };

  const showArea = series.length === 1;
  const tipLeft = hover !== null ? (xAt(hover) / LW) * 100 : 0;
  const tipFlip = tipLeft > 62;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${LW} ${LH}`}
        className="h-auto w-full touch-pan-y select-none"
        role="img"
        aria-label="Line chart of activity over time"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[s.key]} stopOpacity="0.22" />
              <stop offset="100%" stopColor={colors[s.key]} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={LPAD.l}
              x2={LW - LPAD.r}
              y1={yAt(t)}
              y2={yAt(t)}
              stroke="#E2E8F0"
              strokeDasharray={t === 0 ? '0' : '3 4'}
              strokeWidth="1"
            />
            <text x={LPAD.l - 8} y={yAt(t) + 3.5} textAnchor="end" fontSize="10" fill="#94A3B8">
              {Math.round(t)}
            </text>
          </g>
        ))}

        {labels.map((l, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text key={l} x={xAt(i)} y={LH - 8} textAnchor="middle" fontSize="10" fill="#94A3B8">
              {formatLabel(l)}
            </text>
          ) : null
        )}

        {showArea && series[0] && <path d={areaPath(series[0].points)} fill={`url(#area-${series[0].key})`} />}

        {series.map((s) =>
          n > 1 ? (
            <path
              key={s.key}
              d={linePath(s.points)}
              fill="none"
              stroke={colors[s.key]}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null
        )}

        {hover !== null && (
          <line x1={xAt(hover)} x2={xAt(hover)} y1={LPAD.t} y2={yAt(0)} stroke="#CBD5E1" strokeWidth="1" />
        )}

        {series.map((s) =>
          s.points.map((v, i) =>
            n <= 31 || i === hover ? (
              <circle
                key={`${s.key}-${i}`}
                cx={xAt(i)}
                cy={yAt(v)}
                r={i === hover ? 5 : 3}
                fill="#fff"
                stroke={colors[s.key]}
                strokeWidth="2"
              />
            ) : null
          )
        )}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-[140px] rounded-xl border border-ink-100 bg-white/95 px-3 py-2 text-xs shadow-card backdrop-blur"
          style={{
            left: `${tipLeft}%`,
            transform: `translateX(${tipFlip ? 'calc(-100% - 12px)' : '12px'})`,
          }}
        >
          <p className="mb-1 font-bold text-ink-900">{formatLabel(labels[hover])}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-4 text-ink-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: colors[s.key] }} />
                {s.label}
              </span>
              <span className="font-mono font-bold text-ink-900">{s.points[hover]}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bar chart (horizontal, label-friendly)                              */
/* ------------------------------------------------------------------ */

export function BarChart({ items = [], color = '#6366F1' }) {
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...items.map((i) => i.count));
  const total = items.reduce((s, i) => s + i.count, 0);

  return (
    <ul className="space-y-2.5" aria-label="Bar chart">
      {items.map((item, idx) => {
        const pct = (item.count / max) * 100;
        const isActive = active === idx;
        return (
          <li
            key={item.key ?? idx}
            onMouseEnter={() => setActive(idx)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(idx)}
            onBlur={() => setActive(null)}
            tabIndex={0}
            className="group rounded-lg outline-none"
          >
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-semibold text-ink-700" title={item.label}>
                {item.label}
              </span>
              <span className="shrink-0 font-mono font-bold text-ink-900">
                {item.count}
                <span className="ml-1.5 font-sans text-[10px] font-medium text-ink-400">
                  {total ? Math.round((item.count / total) * 100) : 0}%
                </span>
              </span>
            </div>
            <div className="h-6 w-full overflow-hidden rounded-lg bg-ink-100/70">
              <div
                className="h-full rounded-lg transition-all duration-500"
                style={{
                  width: `${Math.max(3, pct)}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}CC)`,
                  opacity: active === null || isActive ? 1 : 0.45,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Pie / donut chart                                                   */
/* ------------------------------------------------------------------ */

const polar = (cx, cy, r, angle) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];

function arcPath(cx, cy, rOuter, rInner, start, end) {
  const large = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = polar(cx, cy, rOuter, start);
  const [x2, y2] = polar(cx, cy, rOuter, end);
  const [x3, y3] = polar(cx, cy, rInner, end);
  const [x4, y4] = polar(cx, cy, rInner, start);
  return `M${x1},${y1} A${rOuter},${rOuter} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${rInner},${rInner} 0 ${large} 0 ${x4},${y4} Z`;
}

export function PieChart({ items = [], total = 0, centerLabel = 'Total' }) {
  const [active, setActive] = useState(null);
  const size = 200;
  const c = size / 2;
  const rOuter = 92;
  const rInner = 58;

  let cursor = -Math.PI / 2;
  const slices = items.map((item, i) => {
    const fraction = total ? item.count / total : 0;
    const start = cursor;
    const end = cursor + fraction * Math.PI * 2;
    cursor = end;
    return { ...item, fraction, start, end, color: CHART_COLORS[i % CHART_COLORS.length] };
  });

  const focus = active !== null ? slices[active] : null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" role="img" aria-label="Pie chart">
          {slices.length === 1 ? (
            <circle
              cx={c}
              cy={c}
              r={(rOuter + rInner) / 2}
              fill="none"
              stroke={slices[0].color}
              strokeWidth={rOuter - rInner}
            />
          ) : (
            slices.map((s, i) => {
              const mid = (s.start + s.end) / 2;
              const [dx, dy] = active === i ? polar(0, 0, 4, mid) : [0, 0];
              return (
                <path
                  key={s.key}
                  d={arcPath(c, c, rOuter, rInner, s.start, s.end - 0.012)}
                  fill={s.color}
                  opacity={active === null || active === i ? 1 : 0.4}
                  transform={`translate(${dx} ${dy})`}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                />
              );
            })
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {focus ? focus.count : total}
          </span>
          <span className="max-w-[90px] truncate text-[10px] font-semibold uppercase tracking-wide text-ink-400">
            {focus ? focus.label : centerLabel}
          </span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {slices.map((s, i) => (
          <li
            key={s.key}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs transition-colors ${
              active === i ? 'bg-ink-50' : ''
            }`}
          >
            <span className="flex min-w-0 items-center gap-2 font-semibold text-ink-700">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="truncate" title={s.label}>
                {truncate(s.label, 28)}
              </span>
            </span>
            <span className="shrink-0 font-mono font-bold text-ink-900">
              {s.count}
              <span className="ml-1.5 font-sans text-[10px] font-medium text-ink-400">
                {Math.round(s.fraction * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}