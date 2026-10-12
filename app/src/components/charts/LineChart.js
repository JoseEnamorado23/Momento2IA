"use client";
import { useWidth } from "./useWidth";

const H = 250;
const M = { top: 28, right: 12, bottom: 38, left: 46 };

/** Marcas "redondas" para el eje: devuelve ~n valores entre lo y hi. */
function niceTicks(lo, hi, n = 5) {
  const raw = (hi - lo) / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw);
  const out = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

/**
 * Curvas por época (entrenamiento continuo, validación discontinua) con línea horizontal de la meta
 * y marca vertical de la época cuyos pesos se conservaron (EarlyStopping con restore_best_weights).
 */
export default function LineChart({ series, meta, bestEpoch, domain, fmt, label }) {
  const [ref, width] = useWidth();
  const n = series[0].values.length;
  const iw = width - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const [lo, hi] = domain;
  const x = (i) => M.left + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v) => M.top + (1 - (v - lo) / (hi - lo)) * ih;
  const yTicks = niceTicks(lo, hi, 4);
  const xTicks = niceTicks(1, n, width < 420 ? 4 : 6).filter((t) => Number.isInteger(t));
  const path = (vals) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const bestX = x(bestEpoch);
  const bestRight = bestX > M.left + iw * 0.65;

  return (
    <div ref={ref} className="lc">
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={label}>
        {yTicks.map((t) => (
          <g key={t}>
            <line className="ch-grid" x1={M.left} x2={M.left + iw} y1={y(t)} y2={y(t)} />
            <text className="ch-tick" x={M.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">{fmt(t)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} className="ch-tick" x={x(t - 1)} y={H - M.bottom + 16} textAnchor="middle">{t}</text>
        ))}
        <text className="ch-axis" x={M.left + iw / 2} y={H - 4} textAnchor="middle">Época</text>

        <line className="ch-best" x1={bestX} x2={bestX} y1={M.top} y2={M.top + ih} />
        <text className="ch-best-label" x={bestX + (bestRight ? -6 : 6)} y={M.top - 8} textAnchor={bestRight ? "end" : "start"}>Época elegida</text>

        <line className="ch-meta" x1={M.left} x2={M.left + iw} y1={y(meta.value)} y2={y(meta.value)} />
        <text className="ch-meta-label" x={M.left + iw - 4} y={y(meta.value) - 6} textAnchor="end">{meta.label}</text>

        {series.map((s) => (
          <path key={s.key} d={path(s.values)} fill="none" className={`ch-line ch-line--${s.key}`} />
        ))}
      </svg>
    </div>
  );
}
