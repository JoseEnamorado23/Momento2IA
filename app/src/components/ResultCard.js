"use client";
import { useEffect, useRef, useState } from "react";
import { pct } from "../lib/labels";

// Evita mostrar 0.0 % / 100.0 % cuando la probabilidad es extrema pero no exacta.
const show = (p) => (p < 0.001 ? "< 0.1 %" : p > 0.999 ? "> 99.9 %" : pct(p, 1));

/** Medidor tipo tira de prueba: dos zonas (negativo / positivo), marca del umbral en 50 % y aguja en la probabilidad. */
function Meter({ proba, negative, positive, label }) {
  const [pos, setPos] = useState(0.5);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPos(proba)); // la aguja se desplaza desde el centro al resultado
    return () => cancelAnimationFrame(id);
  }, [proba]);
  return (
    <div className="meter">
      <div className="meter__track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(proba * 100)}>
        <div className="meter__zone meter__zone--neg" />
        <div className="meter__zone meter__zone--pos" />
        <div className="meter__tick" />
        <div className="meter__needle" style={{ left: `${(pos * 100).toFixed(2)}%` }}><span /></div>
      </div>
      <div className="meter__labels">
        <span>{negative}</span>
        <span className="meter__thr">umbral 50 %</span>
        <span>{positive}</span>
      </div>
    </div>
  );
}

function ResultCard({ proba, positive, negative, probLabel, exampleLabel }) {
  const isPos = proba >= 0.5;
  const confidence = isPos ? proba : 1 - proba;
  return (
    <section className={`result ${isPos ? "result--pos" : "result--neg"}`} data-testid="result">
      <h3 className="result__class" data-testid="result-class">{isPos ? positive : negative}</h3>
      <p className="result__num"><strong data-testid="result-proba">{show(proba)}</strong></p>
      <p className="result__numlabel">{probLabel}</p>
      <Meter proba={proba} negative={negative.split(" (")[0]} positive={positive.split(" (")[0]} label={probLabel} />
      <dl className="result__facts">
        <div><dt>Confianza en la clase predicha</dt><dd>{show(confidence)}</dd></div>
        {exampleLabel && <div><dt>Etiqueta real del ejemplo (test)</dt><dd>{exampleLabel}</dd></div>}
      </dl>
    </section>
  );
}

function EmptyResult() {
  return (
    <div className="result-empty">
      <p className="result-empty__title">Aún no hay resultado</p>
      <p>Completa los campos o carga un ejemplo y pulsa <strong>Predecir</strong>. Aquí aparecerá la clase estimada y su probabilidad.</p>
    </div>
  );
}

/** Panel de resultado: fijo junto al formulario en escritorio; en móvil la vista baja sola al resultado. */
export function ResultPanel(props) {
  const ref = useRef(null);
  useEffect(() => {
    if (props.proba === null || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      ref.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }
  }, [props.proba]);
  return (
    <aside ref={ref} className="result-panel" aria-live="polite" aria-label="Resultado de la predicción">
      {props.proba === null ? <EmptyResult /> : <ResultCard {...props} />}
    </aside>
  );
}

export default ResultCard;
