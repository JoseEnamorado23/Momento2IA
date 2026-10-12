"use client";
import { useRef, useState } from "react";
import { predictFromInput } from "../lib/inference";
import { CANCER_GROUPS, cancerField } from "../lib/labels";
import { ResultPanel } from "./ResultCard";

export default function CancerForm({ bundle }) {
  const { model, preproc, examples } = bundle;
  const keys = preproc.features.map((f) => f.key);
  const empty = Object.fromEntries(keys.map((k) => [k, ""]));
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState({});
  const [proba, setProba] = useState(null);
  const [exampleLabel, setExampleLabel] = useState(null);
  const formRef = useRef(null);

  const setField = (k, v) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setProba(null); setExampleLabel(null);
  };

  const loadExample = (which) => {
    const ex = examples[which];
    setValues(Object.fromEntries(keys.map((k) => [k, String(ex.input[k])])));
    setErrors({}); setProba(null);
    setExampleLabel(ex.label === 1 ? "Maligno" : "Benigno");
  };

  const validate = () => {
    const errs = {};
    for (const k of keys) {
      const raw = String(values[k]).trim().replace(",", ".");
      const [lo, hi] = preproc.ranges[k];
      if (raw === "") errs[k] = "Campo obligatorio";
      else if (!Number.isFinite(Number(raw))) errs[k] = "Debe ser un número";
      else if (Number(raw) < lo || Number(raw) > hi) errs[k] = `Fuera del rango razonable (${lo} a ${hi})`;
    }
    return errs;
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      setProba(null);
      const first = keys.find((k) => errs[k]);
      formRef.current?.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    const input = Object.fromEntries(keys.map((k) => [k, Number(String(values[k]).trim().replace(",", "."))]));
    setProba(predictFromInput(model, preproc, input));
  };

  const clear = () => { setValues(empty); setErrors({}); setProba(null); setExampleLabel(null); };
  const nErr = Object.values(errors).filter(Boolean).length;

  return (
    <div className="workbench">
    <form ref={formRef} onSubmit={submit} noValidate data-testid="form-cancer">
      <div className="actions">
        <button type="button" className="chip" onClick={() => loadExample("negative")} data-testid="ex-benigno">Cargar ejemplo benigno</button>
        <button type="button" className="chip" onClick={() => loadExample("positive")} data-testid="ex-maligno">Cargar ejemplo maligno</button>
        <button type="button" className="btn btn--link" onClick={clear}>Limpiar</button>
      </div>
      <p className="hint">Los ejemplos son filas reales del conjunto de test. Las medidas provienen de imágenes de biopsia (fine-needle aspirate).</p>
      {nErr > 0 && <p className="alert" role="alert">Revisa {nErr} campo{nErr > 1 ? "s" : ""} marcado{nErr > 1 ? "s" : ""} antes de continuar.</p>}
      {CANCER_GROUPS.map((g) => (
        <fieldset key={g.id} className="group">
          <legend>{g.title}</legend>
          <p className="hint">{g.hint}</p>
          <div className="grid">
            {keys.filter((k) => cancerField(k).group === g.id).map((k) => {
              const { label } = cancerField(k);
              const [a, b] = preproc.typical[k];
              return (
                <label key={k} className={`field ${errors[k] ? "field--err" : ""}`}>
                  <span className="field__label">{label}</span>
                  <input name={k} type="text" inputMode="decimal" autoComplete="off" value={values[k]}
                         onChange={(e) => setField(k, e.target.value)} aria-invalid={!!errors[k]} />
                  <small className="field__hint">{errors[k] ? errors[k] : `Típico: ${a} a ${b}`}</small>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="submitbar"><button type="submit" className="btn btn--primary" data-testid="submit-cancer">Predecir</button></div>
    </form>
    <ResultPanel proba={proba} positive="Maligno (M)" negative="Benigno (B)" probLabel="Probabilidad de malignidad" exampleLabel={exampleLabel} />
    </div>
  );
}
