"use client";
import { useState } from "react";
import CancerForm from "../components/CancerForm";
import DiabetesForm from "../components/DiabetesForm";
import ModelInfo from "../components/ModelInfo";
import ChartsLazy from "../components/ChartsLazy";
import { useModels } from "../lib/useModels";
import { INFO, describeArch } from "../lib/info";

const TABS = [
  { id: "cancer", label: "Cáncer de mama", desc: "30 medidas de biopsia" },
  { id: "diabetes", label: "Diabetes", desc: "Edad, género y 14 síntomas" },
];

export default function Home() {
  const [tab, setTab] = useState("cancer");
  const { status, data, error } = useModels();

  const infoCancer = data && { ...INFO.cancer, arquitectura: describeArch(data.cancer.model) };
  const infoDiabetes = data && { ...INFO.diabetes, arquitectura: describeArch(data.diabetes.model) };

  return (
    <main className="page">
      <header className="hero">
        <h1>Clasificadores con redes neuronales</h1>
        <p>Dos modelos de Keras entrenados desde cero.</p>
      </header>

      <div className="tabs" role="tablist" aria-label="Modelo">
        {TABS.map((t) => (
          <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`}
                  className={`tab ${tab === t.id ? "tab--active" : ""}`} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}>
            <span className="tab__name">{t.label}</span>
            <span className="tab__desc">{t.desc}</span>
          </button>
        ))}
      </div>

      {status === "loading" && <p className="status" data-testid="status">Cargando modelos…</p>}
      {status === "error" && <p className="alert" role="alert">No se pudieron cargar los modelos: {error}</p>}

      {status === "ready" && (
        <>
          <section role="tabpanel" id="panel-cancer" aria-labelledby="tab-cancer" hidden={tab !== "cancer"} className="panel">
            <div className="panel__head">
              <h2>Cáncer de mama (Wisconsin)</h2>
              <p>Clasifica un tumor como benigno o maligno a partir de 30 medidas de núcleos celulares.</p>
            </div>
            <CancerForm bundle={data.cancer} />
            <ModelInfo info={infoCancer} />
            <ChartsLazy dataset="cancer" />
          </section>
          <section role="tabpanel" id="panel-diabetes" aria-labelledby="tab-diabetes" hidden={tab !== "diabetes"} className="panel">
            <div className="panel__head">
              <h2>Diabetes (síntomas)</h2>
              <p>Estima si un paciente es positivo o negativo a partir de la edad, el género y 14 síntomas.</p>
            </div>
            <DiabetesForm bundle={data.diabetes} />
            <ModelInfo info={infoDiabetes} />
            <ChartsLazy dataset="diabetes" />
          </section>
        </>
      )}

      <footer className="footer">
        <p>Proyecto de Deep Learning, UCC.</p>
      </footer>
    </main>
  );
}
