import { META, cumpleMeta, pct } from "../lib/labels";

const f3 = (v) => v.toFixed(3);

/** Sección "Sobre el modelo": dataset, arquitectura y métricas (app/data/resultados_*.json). */
export default function ModelInfo({ info }) {
  const m = info.metricas;
  const rows = [
    { name: "Entrenamiento", loss: m.train.loss, acc: m.train.accuracy, n: info.n.train, key: "train" },
    { name: "Validación", loss: m.val.loss, acc: m.val.accuracy, n: info.n.val, key: "val" },
    { name: "Test", loss: m.test.loss, acc: m.test.accuracy, n: info.n.test, key: "test" },
    { name: "Validación cruzada", loss: m.cv.loss_mean, acc: m.cv.acc_mean, lossStd: m.cv.loss_std, accStd: m.cv.acc_std, key: "cv" },
  ];
  return (
    <details className="info" open>
      <summary>Sobre el modelo</summary>
      <div className="info__body">
        <dl className="info__about">
          <div><dt>Dataset</dt><dd>{info.dataset}</dd></div>
          <div><dt>Arquitectura</dt><dd>{info.arquitectura}.</dd></div>
        </dl>

        <div className="info__metrics">
          <table className="metrics">
            <thead>
              <tr><th>Conjunto</th><th>Loss</th><th>Accuracy</th><th>Meta ({pct(META.acc)})</th><th>¿Cumple la meta?</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ok = cumpleMeta(r.loss, r.acc);
                return (
                <tr key={r.key}>
                  <th scope="row">{r.name}{r.n ? <small>{r.n} muestras</small> : null}</th>
                  <td data-label="Loss">{f3(r.loss)}{r.lossStd !== undefined && <small>± {f3(r.lossStd)}</small>}</td>
                  <td data-label="Accuracy">{pct(r.acc)}{r.accStd !== undefined && <small>± {pct(r.accStd)}</small>}</td>
                  <td data-label="Frente a la meta" className="metrics__bar">
                    <span className="accbar" aria-hidden="true"><i style={{ width: `${(r.acc * 100).toFixed(1)}%` }} /><b style={{ left: `${META.acc * 100}%` }} /></span>
                  </td>
                  <td data-label="¿Cumple la meta?"><span className={`badge ${ok ? "badge--ok" : "badge--no"}`}>{ok ? "✓ Cumple" : "✗ No cumple"}</span></td>
                </tr>
                );
              })}
            </tbody>
          </table>
          <p className="metrics__legend">Meta: loss &lt; {META.loss} y accuracy &gt; {pct(META.acc)} (marca vertical de la barra).</p>
        </div>
      </div>
    </details>
  );
}
