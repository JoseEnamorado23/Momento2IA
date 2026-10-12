// Información de la sección "Sobre el modelo". Las métricas se importan de app/data/ (copia de results/resultados_*.json
// generada por scripts/export_models.py), así que app/ no depende de carpetas externas.
import cancerRes from "../../data/resultados_cancer.json";
import diabetesRes from "../../data/resultados_diabetes_early.json";

const DATASET_TEXT = {
  cancer: "Breast Cancer Wisconsin (Diagnostic): 569 tumores, 30 variables numéricas de imágenes de biopsia; clases B=benigno (357) y M=maligno (212).",
  diabetes: "Early Stage Diabetes Risk Prediction (UCI): 520 pacientes de un hospital de Sylhet (Bangladesh), 16 variables autorreportadas; 269 filas duplicadas eliminadas (251 únicas).",
};

function fromResults(res, dataset) {
  return {
    dataset,
    metricas: { train: res.train, val: res.val, test: res.test, cv: res.cv },
    n: { train: res.n_train, val: res.n_val, test: res.n_test },
    test_report: res.test_report,
    duplicados: res.duplicados ?? null,
  };
}

export const INFO = {
  cancer: fromResults(cancerRes, DATASET_TEXT.cancer),
  diabetes: fromResults(diabetesRes, DATASET_TEXT.diabetes),
};

/** Describe la arquitectura a partir de las capas del model.json cargado (ej.: "entrada 30 → Dense 128 (relu) → …"). */
export function describeArch(model) {
  const parts = [`entrada ${model.n_inputs}`];
  for (const l of model.layers) {
    if (l.type === "dense") parts.push(`Dense ${l.bias.length} (${l.activation})`);
    else if (l.type === "conv1d") parts.push(`Conv1D ${l.bias.length} filtros k=${l.kernel.length} (${l.activation}, ${l.padding})`);
    else if (l.type === "maxpool1d") parts.push(`MaxPool ${l.pool}`);
    else if (l.type === "global_avg_pool1d") parts.push("GlobalAvgPool");
    else if (l.type === "batchnorm") parts.push("BatchNorm");
    else if (l.type === "reshape") parts.push("Reshape");
  }
  return parts.join(" → ");
}
