// Solo se usa en el servidor (ruta /api/recomendar).
export const STYLES = {
  conciso: "Responde de forma concisa: máximo 5 viñetas cortas, sin introducción larga.",
  detallado: "Responde de forma detallada: explica brevemente qué significa el resultado y el motivo de cada recomendación (unas 200-300 palabras).",
  empatico: "Responde con un tono cálido, cercano y tranquilizador, reconociendo la preocupación que puede generar el resultado, y da recomendaciones claras.",
};

const DATASETS = {
  cancer: {
    tema: "clasificación de tumores de mama (benigno/maligno) a partir de medidas de biopsia de aspiración con aguja fina",
    positivo: "Maligno", negativo: "Benigno",
  },
  diabetes: {
    tema: "detección temprana de diabetes a partir de edad, género y síntomas",
    positivo: "Positivo", negativo: "Negativo",
  },
};

export const isDataset = (d) => Object.hasOwn(DATASETS, d);

export function buildMessages({ dataset, proba, context, style }) {
  const d = DATASETS[dataset];
  const pos = proba >= 0.5;
  const system =
    "Eres un asistente de apoyo informativo en salud dentro de un proyecto académico de Deep Learning. " +
    "Recibes la predicción de una red neuronal y generas recomendaciones en español. " +
    "No eres médico: no des un diagnóstico definitivo, no recetes medicamentos ni dosis, y recalca que el resultado es un apoyo " +
    "y que debe confirmarlo un profesional de la salud. Escribe en texto plano, sin markdown ni asteriscos. " +
    STYLES[style];
  const lines = Object.entries(context).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  const user =
    `Modelo: ${d.tema}.\n` +
    `Predicción: ${pos ? d.positivo : d.negativo} (probabilidad de la clase "${d.positivo}": ${(proba * 100).toFixed(1)} %).\n` +
    `Datos de entrada del paciente:\n${lines}\n\n` +
    "Genera recomendaciones sobre los siguientes pasos y cómo manejar la situación, incluyendo cuándo acudir a un especialista.";
  return [{ role: "system", content: system }, { role: "user", content: user }];
}
