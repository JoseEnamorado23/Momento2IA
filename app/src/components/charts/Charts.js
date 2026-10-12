"use client";
import LineChart from "./LineChart";
import ConfusionMatrix from "./ConfusionMatrix";
import CvBars from "./CvBars";
import { META } from "../../lib/labels";
import cancerG from "../../../data/graficas_cancer.json";
import diabetesG from "../../../data/graficas_diabetes_early.json";
import cancerR from "../../../data/resultados_cancer.json";
import diabetesR from "../../../data/resultados_diabetes_early.json";

const SETS = {
  cancer: { g: cancerG, r: cancerR, neg: "Benigno", pos: "Maligno" },
  diabetes: { g: diabetesG, r: diabetesR, neg: "Negativo", pos: "Positivo" },
};

const Legend = ({ items }) => (
  <ul className="legend" aria-hidden="true">
    {items.map((it) => (
      <li key={it.text}><svg width="26" height="10" viewBox="0 0 26 10"><line x1="1" x2="25" y1="5" y2="5" className={it.cls} /></svg>{it.text}</li>
    ))}
  </ul>
);

/** Gráficas del modelo (datos de app/data/graficas_*.json, generados desde results/). Se carga de forma diferida. */
export default function Charts({ dataset }) {
  const { g, r, neg, pos } = SETS[dataset];
  const h = g.history;
  const best = g.best_epoch;
  const accLo = Math.max(0, Math.floor((Math.min(...h.accuracy, ...h.val_accuracy) - 0.02) * 20) / 20);
  const lossHi = Math.ceil(Math.max(...h.loss, ...h.val_loss) * 10) / 10;
  const common = [
    { cls: "ch-line ch-line--train", text: "Entrenamiento" },
    { cls: "ch-line ch-line--val", text: "Validación" },
  ];
  const n = r.n_test;
  return (
    <section className="charts" aria-label="Gráficas del modelo">
      <h3 className="charts__title">Gráficas del modelo</h3>
      <div className="charts__grid">
        <figure className="chart-card">
          <figcaption><strong>Loss por época</strong><span>Menos es mejor. La meta es estar por debajo de {META.loss}.</span></figcaption>
          <Legend items={[...common, { cls: "ch-meta", text: "Meta" }]} />
          <LineChart
            label={`Loss de entrenamiento y validación por época, ${g.epochs} épocas, con la meta en ${META.loss}`}
            series={[{ key: "train", values: h.loss }, { key: "val", values: h.val_loss }]}
            meta={{ value: META.loss, label: `Meta ${META.loss}`, labelBelow: false }}
            bestEpoch={best} domain={[0, lossHi]} fmt={(v) => String(+v.toFixed(2))}
          />
        </figure>
        <figure className="chart-card">
          <figcaption><strong>Accuracy por época</strong><span>Más es mejor. La meta es superar {(META.acc * 100).toFixed(1)} %.</span></figcaption>
          <Legend items={[...common, { cls: "ch-meta", text: "Meta" }]} />
          <LineChart
            label={`Accuracy de entrenamiento y validación por época, ${g.epochs} épocas, con la meta en ${(META.acc * 100).toFixed(1)} por ciento`}
            series={[{ key: "train", values: h.accuracy }, { key: "val", values: h.val_accuracy }]}
            meta={{ value: META.acc, label: `Meta ${(META.acc * 100).toFixed(1)} %`, labelBelow: true }}
            bestEpoch={best} domain={[accLo, 1]} fmt={(v) => `${Math.round(v * 100)} %`}
          />
        </figure>
        <p className="charts__note">
          La línea vertical marca la época con menor loss de validación: el entrenamiento se detiene después y se conservan los pesos de esa época.
          {r.config.l2 > 0 && " La loss de las curvas incluye la penalización L2, por eso difiere un poco de la loss de la tabla."}
        </p>

        <figure className="chart-card">
          <figcaption><strong>Matriz de confusión (test)</strong><span>{n} muestras que el modelo no vio al entrenar ni al elegir la configuración.</span></figcaption>
          <ConfusionMatrix cm={g.confusion} neg={neg} pos={pos} />
        </figure>
        <figure className="chart-card">
          <figcaption><strong>Accuracy en validación cruzada</strong><span>Media ± desviación entre particiones. Relleno liso: red neuronal; rayado: modelos de referencia. El eje empieza en 50 %.</span></figcaption>
          <CvBars rows={g.cv} meta={META.acc} />
        </figure>
      </div>
    </section>
  );
}
