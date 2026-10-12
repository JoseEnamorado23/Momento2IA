"use client";
import { useState } from "react";
import CancerForm from "../components/CancerForm";
import DiabetesForm from "../components/DiabetesForm";
import ModelInfo from "../components/ModelInfo";
import { useModels } from "../lib/useModels";
import { pct } from "../lib/labels";
import { INFO, describeArch } from "../lib/info";

const TABS = [
  { id: "cancer", label: "Cáncer de mama" },
  { id: "diabetes", label: "Diabetes (síntomas)" },
];

export default function Home() {
  const [tab, setTab] = useState("cancer");
  const { status, data, error } = useModels();

  const infoCancer = data && { ...INFO.cancer, arquitectura: describeArch(data.cancer.model) };
  const infoDiabetes = data && { ...INFO.diabetes, arquitectura: describeArch(data.diabetes.model) };

  const cancerNote = data && (() => {
    const m = INFO.cancer.metricas;
    return `Un ${pct(m.test.accuracy)} en test con solo ${INFO.cancer.n.test} muestras puede deberse a la partición; la estimación más estable es la validación cruzada (${pct(m.cv.acc_mean)} de accuracy, loss ${m.cv.loss_mean.toFixed(3)}).`;
  })();
  const diabetesNote = data && `Dataset pequeño (${INFO.diabetes.duplicados?.unicas ?? "251"} pacientes únicos), de un solo hospital y con síntomas autorreportados; con ${INFO.diabetes.n.test} muestras de test cada error mueve unos ${(100 / INFO.diabetes.n.test).toFixed(1)} puntos de accuracy. Se eliminaron ${INFO.diabetes.duplicados?.duplicadas ?? 269} filas duplicadas para evitar fuga de datos.`;

  return (
    <main className="page">
      <header className="hero">
        <h1>Clasificadores con redes neuronales</h1>
        <p>Modelos entrenados desde cero con Keras. La predicción se calcula <strong>en tu navegador</strong>: ningún dato se envía a un servidor.</p>
        <p className="disclaimer" role="note"><strong>Herramienta académica, no es un diagnóstico médico.</strong></p>
      </header>

      <div className="tabs" role="tablist" aria-label="Modelo">
        {TABS.map((t) => (
          <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`}
                  className={`tab ${tab === t.id ? "tab--active" : ""}`} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}>
            {t.label}
          </button>
        ))}
      </div>

      {status === "loading" && <p className="status" data-testid="status">Cargando modelos…</p>}
      {status === "error" && <p className="alert" role="alert">No se pudieron cargar los modelos: {error}</p>}

      {status === "ready" && (
        <>
          <section role="tabpanel" id="panel-cancer" aria-labelledby="tab-cancer" hidden={tab !== "cancer"} className="panel">
            <h2>Cáncer de mama (Wisconsin)</h2>
            <p className="lead">Clasifica un tumor como benigno o maligno a partir de 30 medidas de núcleos celulares.</p>
            <CancerForm bundle={data.cancer} />
            <ModelInfo info={infoCancer} extraNote={cancerNote} />
          </section>
          <section role="tabpanel" id="panel-diabetes" aria-labelledby="tab-diabetes" hidden={tab !== "diabetes"} className="panel">
            <h2>Diabetes (síntomas, Early Stage)</h2>
            <p className="lead">Estima si un paciente es positivo o negativo a partir de la edad, el género y 14 síntomas.</p>
            <DiabetesForm bundle={data.diabetes} />
            <ModelInfo info={infoDiabetes} extraNote={diabetesNote} />
          </section>
        </>
      )}

      <footer className="footer">
        <p>Proyecto académico de Deep Learning (UCC). Herramienta académica, no es un diagnóstico médico.</p>
      </footer>
    </main>
  );
}
