import { pct } from "../lib/labels";

// Evita mostrar 0.0 % / 100.0 % cuando la probabilidad es extrema pero no exacta.
const show = (p) => (p < 0.001 ? "< 0.1 %" : p > 0.999 ? "> 99.9 %" : pct(p, 1));

/** Muestra clase predicha, probabilidad en porcentaje y una barra visual (marca del umbral en 50 %). */
export default function ResultCard({ proba, positive, negative, probLabel, exampleLabel }) {
  const isPos = proba >= 0.5;
  const confidence = isPos ? proba : 1 - proba;
  return (
    <section className={`result ${isPos ? "result--pos" : "result--neg"}`} aria-live="polite" data-testid="result">
      <p className="result__eyebrow">Predicción del modelo</p>
      <h3 className="result__class" data-testid="result-class">{isPos ? positive : negative}</h3>
      <p className="result__prob">
        {probLabel}: <strong data-testid="result-proba">{show(proba)}</strong>
      </p>
      <div className="bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(proba * 100)} aria-label={probLabel}>
        <div className={`bar__fill ${isPos ? "bar__fill--pos" : "bar__fill--neg"}`} style={{ width: `${(proba * 100).toFixed(2)}%` }} />
        <div className="bar__threshold" title="Umbral de decisión (50 %)" />
      </div>
      <div className="bar__scale"><span>0 %</span><span>Umbral 50 %</span><span>100 %</span></div>
      <p className="result__small">Confianza en la clase predicha: {show(confidence)}</p>
      {exampleLabel && <p className="result__small">Etiqueta real del ejemplo cargado (conjunto de test): <strong>{exampleLabel}</strong></p>}
      <p className="result__disclaimer">Herramienta académica, no es un diagnóstico médico.</p>
    </section>
  );
}
