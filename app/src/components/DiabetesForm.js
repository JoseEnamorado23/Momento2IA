"use client";
import { useRef, useState } from "react";
import { predictFromInput } from "../lib/inference";
import { DIABETES_SYMPTOMS } from "../lib/labels";
import ResultCard from "./ResultCard";

export default function DiabetesForm({ bundle }) {
  const { model, preproc, examples } = bundle;
  const symptoms = preproc.features.map((f) => f.key).filter((k) => k !== "age" && k !== "gender");
  const empty = { age: "", gender: "", ...Object.fromEntries(symptoms.map((k) => [k, ""])) };
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
    setValues(Object.fromEntries(Object.keys(empty).map((k) => [k, String(ex.input[k])])));
    setErrors({}); setProba(null);
    setExampleLabel(ex.label === 1 ? "Positivo" : "Negativo");
  };

  const validate = () => {
    const errs = {};
    const [lo, hi] = preproc.ranges.age;
    const age = String(values.age).trim();
    if (age === "") errs.age = "Campo obligatorio";
    else if (!Number.isFinite(Number(age))) errs.age = "Debe ser un número";
    else if (Number(age) < lo || Number(age) > hi) errs.age = `Edad fuera del rango razonable (${lo} a ${hi})`;
    for (const k of ["gender", ...symptoms]) if (values[k] === "") errs[k] = "Selecciona una opción";
    return errs;
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    const first = Object.keys(empty).find((k) => errs[k]);
    if (first) { setProba(null); formRef.current?.querySelector(`[name="${first}"]`)?.focus(); return; }
    setProba(predictFromInput(model, preproc, { ...values, age: Number(values.age) }));
  };

  const clear = () => { setValues(empty); setErrors({}); setProba(null); setExampleLabel(null); };
  const nErr = Object.values(errors).filter(Boolean).length;

  const yesNo = (k) => (
    <select name={k} value={values[k]} onChange={(e) => setField(k, e.target.value)} aria-invalid={!!errors[k]}>
      <option value="">Seleccionar…</option>
      <option value="Yes">Sí</option>
      <option value="No">No</option>
    </select>
  );

  return (
    <form ref={formRef} onSubmit={submit} noValidate data-testid="form-diabetes">
      <div className="actions">
        <button type="button" className="btn btn--ghost" onClick={() => loadExample("positive")} data-testid="ex-positivo">Cargar ejemplo positivo</button>
        <button type="button" className="btn btn--ghost" onClick={() => loadExample("negative")} data-testid="ex-negativo">Cargar ejemplo negativo</button>
        <button type="button" className="btn btn--link" onClick={clear}>Limpiar</button>
      </div>
      <p className="hint">Los ejemplos son filas reales del conjunto de test. Los síntomas son autorreportados (Sí/No).</p>
      {nErr > 0 && <p className="alert" role="alert">Revisa {nErr} campo{nErr > 1 ? "s" : ""} marcado{nErr > 1 ? "s" : ""} antes de continuar.</p>}
      <fieldset className="group">
        <legend>Datos del paciente</legend>
        <div className="grid">
          <label className={`field ${errors.age ? "field--err" : ""}`}>
            <span className="field__label">Edad (años)</span>
            <input name="age" type="text" inputMode="numeric" autoComplete="off" value={values.age}
                   onChange={(e) => setField("age", e.target.value)} aria-invalid={!!errors.age} />
            <small className="field__hint">{errors.age ? errors.age : "Entre 1 y 120"}</small>
          </label>
          <label className={`field ${errors.gender ? "field--err" : ""}`}>
            <span className="field__label">Género</span>
            <select name="gender" value={values.gender} onChange={(e) => setField("gender", e.target.value)} aria-invalid={!!errors.gender}>
              <option value="">Seleccionar…</option>
              <option value="Male">Hombre (Male)</option>
              <option value="Female">Mujer (Female)</option>
            </select>
            <small className="field__hint">{errors.gender || " "}</small>
          </label>
        </div>
      </fieldset>
      <fieldset className="group">
        <legend>Síntomas</legend>
        <div className="grid">
          {symptoms.map((k) => (
            <label key={k} className={`field ${errors[k] ? "field--err" : ""}`}>
              <span className="field__label">{DIABETES_SYMPTOMS[k]}</span>
              {yesNo(k)}
              <small className="field__hint">{errors[k] || " "}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" className="btn btn--primary" data-testid="submit-diabetes">Predecir</button>
      {proba !== null && (
        <ResultCard proba={proba} positive="Positivo (riesgo de diabetes)" negative="Negativo" probLabel="Probabilidad de clase positiva" exampleLabel={exampleLabel} />
      )}
    </form>
  );
}
