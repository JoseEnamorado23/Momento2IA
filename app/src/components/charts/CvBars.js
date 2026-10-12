const LO = 0.5;                                     // el eje empieza en 50 % (se avisa en el texto del gráfico)
const pos = (v) => `${(((v - LO) / (1 - LO)) * 100).toFixed(2)}%`;
const f1 = (v) => (v * 100).toFixed(1);
const TICKS = [0.5, 0.6, 0.7, 0.8, 0.9, 1];

/** Accuracy en validación cruzada (media ± desviación): el modelo Keras (relleno liso) frente a los de referencia (rayado). */
export default function CvBars({ rows, meta }) {
  return (
    <div className="cv" role="img" aria-label={"Accuracy en validación cruzada: " + rows.map((r) => `${r.modelo} ${f1(r.acc_mean)} más o menos ${f1(r.acc_std)} por ciento`).join("; ") + `. Meta ${f1(meta)} por ciento.`}>
      <div className="cv__plot" aria-hidden="true">
        {TICKS.map((t) => <i key={t} className="cv__grid" style={{ left: pos(t) }} />)}
        <i className="cv__meta" style={{ left: pos(meta) }} />
        <span className="cv__meta-label" style={{ left: pos(meta) }}>Meta {f1(meta)} %</span>
        {rows.map((r) => (
          <div key={r.modelo} className={`cv__row ${r.keras ? "cv__row--keras" : ""}`}>
            <div className="cv__head"><span>{r.modelo}</span><b>{f1(r.acc_mean)} ± {f1(r.acc_std)} %</b></div>
            <div className="cv__track">
              <span className="cv__fill" style={{ width: pos(r.acc_mean) }} />
              <span className="cv__err" style={{ left: pos(Math.max(LO, r.acc_mean - r.acc_std)), width: `calc(${pos(Math.min(1, r.acc_mean + r.acc_std))} - ${pos(Math.max(LO, r.acc_mean - r.acc_std))})` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="cv__axis" aria-hidden="true">
        {TICKS.map((t, i) => (
          <span key={t} style={{ left: pos(t), transform: `translateX(${i === 0 ? "0" : i === TICKS.length - 1 ? "-100%" : "-50%"})` }}>{Math.round(t * 100)} %</span>
        ))}
      </div>
    </div>
  );
}
