"use client";
import { useEffect, useState } from "react";

const FILES = ["model", "preproc", "examples"];

async function loadDataset(dir) {
  const res = await Promise.all(
    FILES.map((f) =>
      fetch(`/models/${dir}/${f}.json`).then((r) => {
        if (!r.ok) throw new Error(`No se pudo cargar /models/${dir}/${f}.json (${r.status})`);
        return r.json();
      })
    )
  );
  return Object.fromEntries(FILES.map((f, i) => [f, res[i]]));
}

// La promesa se guarda a nivel de módulo: los modelos se descargan una sola vez aunque el componente se monte varias veces.
let cache = null;
const loadAll = () => (cache ??= Promise.all([loadDataset("cancer"), loadDataset("diabetes")]).catch((e) => { cache = null; throw e; }));

/** Carga una sola vez, al abrir la página, el modelo, el preprocesamiento y los ejemplos de ambos datasets. */
export function useModels() {
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  useEffect(() => {
    let alive = true;
    loadAll()
      .then(([cancer, diabetes]) => alive && setState({ status: "ready", data: { cancer, diabetes }, error: null }))
      .catch((e) => alive && setState({ status: "error", data: null, error: e.message }));
    return () => { alive = false; };
  }, []);
  return state;
}
