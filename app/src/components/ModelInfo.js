import { META, cumpleMeta, pct } from "../lib/labels";

const f3 = (v) => v.toFixed(3);

/** Sección "Sobre el modelo": dataset, arquitectura y métricas honestas leídas de results/resultados_*.json. */
export default function ModelInfo({ info, extraNote }) {
  const m = info.metricas;
  const rows = [
    { name: "Entrenamiento", loss: m.train.loss, acc: m.train.accuracy, n: info.n.train, key: "train" },
    { name: "Validación", loss: m.val.loss, acc: m.val.accuracy, n: info.n.val, key: "val" },
    { name: "Test", loss: m.test.loss, acc: m.test.accuracy, n: info.n.test, key: "test" },
    { name: "Validación cruzada", loss: m.cv.loss_mean, acc: m.cv.acc_mean, lossStd: m.cv.loss_std, accStd: m.cv.acc_std, key: "cv" },
  ];
  const noCumple = rows.filter((r) => !cumpleMeta(r.loss, r.acc)).map((r) => r.name.toLowerCase());
  const si = rows.filter((r) => cumpleMeta(r.loss, r.acc)).map((r) => r.name.toLowerCase());
  const t = info.test_report;
  return (
    <details className="info" open>
      <summary>Sobre el modelo</summary>
      <dl>
        <dt>Dataset</dt><dd>{info.dataset}</dd>
        <dt>Arquitectura</dt><dd>{info.arquitectura}. Entrenada desde cero con Keras (Adam, EarlyStopping, ReduceLROnPlateau); sin modelos pre-entrenados.</dd>
        <dt>Ejecución</dt><dd>La predicción se calcula en tu navegador con pesos exportados a JSON; no se envía ningún dato a un servidor.</dd>
      </dl>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Conjunto</th><th>Loss</th><th>Accuracy</th><th>¿Cumple la meta?</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const ok = cumpleMeta(r.loss, r.acc);
              return (
                <tr key={r.key}>
                  <td>{r.name}{r.n ? <small> ({r.n} muestras)</small> : null}</td>
                  <td>{f3(r.loss)}{r.lossStd !== undefined && <small> ± {f3(r.lossStd)}</small>}</td>
                  <td>{pct(r.acc)}{r.accStd !== undefined && <small> ± {pct(r.accStd)}</small>}</td>
                  <td className={ok ? "ok" : "no"}>{ok ? "Sí" : "No"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        Meta de la actividad: <strong>loss &lt; {META.loss} y accuracy &gt; {pct(META.acc)}</strong>.{" "}
        {si.length > 0 && <>Se cumple solo en: <strong>{si.join(", ")}</strong>. </>}
        <strong>No se cumple en: {noCumple.join(", ")}.</strong>
      </p>
      <p className="note">
        Test: precisión {pct(t.precision)}, recall {pct(t.recall)}, F1 {pct(t.f1)} (verdaderos positivos {t.tp}, falsos negativos {t.fn}, falsos positivos {t.fp}, verdaderos negativos {t.tn}).
      </p>
      {extraNote && <p className="note">{extraNote}</p>}
    </details>
  );
}
