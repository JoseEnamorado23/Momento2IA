const pct = (a, b) => (b === 0 ? "—" : `${((100 * a) / b).toFixed(a === b || a === 0 ? 0 : 1)} %`);

/** Matriz de confusión 2×2 del test. Aciertos y errores se distinguen por color, borde y texto. */
export default function ConfusionMatrix({ cm, neg, pos }) {
  const rowN = cm.tn + cm.fp;
  const rowP = cm.fn + cm.tp;
  const cells = [
    { key: "tn", v: cm.tn, ok: true, share: pct(cm.tn, rowN) + ` de los ${neg.toLowerCase()}s reales` },
    { key: "fp", v: cm.fp, ok: false, share: pct(cm.fp, rowN) + ` de los ${neg.toLowerCase()}s reales` },
    { key: "fn", v: cm.fn, ok: false, share: pct(cm.fn, rowP) + ` de los ${pos.toLowerCase()}s reales` },
    { key: "tp", v: cm.tp, ok: true, share: pct(cm.tp, rowP) + ` de los ${pos.toLowerCase()}s reales` },
  ];
  return (
    <div className="cm" role="table" aria-label="Matriz de confusión del conjunto de test">
      <div className="cm__corner" aria-hidden="true" />
      <div className="cm__colhead cm__span" role="columnheader">Predicho: {neg}</div>
      <div className="cm__colhead cm__span" role="columnheader">Predicho: {pos}</div>
      {[0, 1].map((r) => (
        <div className="cm__row" role="row" key={r}>
          <div className="cm__rowhead" role="rowheader">Real: {r === 0 ? neg : pos}</div>
          {cells.slice(r * 2, r * 2 + 2).map((c) => (
            <div key={c.key} role="cell" className={`cm__cell ${c.ok ? "cm__cell--ok" : "cm__cell--bad"}`}>
              <strong>{c.v}</strong>
              <span className="cm__tag">{c.ok ? "✓ Acierto" : "✗ Error"}</span>
              <small>{c.share}</small>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
