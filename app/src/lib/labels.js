// Etiquetas en español y utilidades de presentación. Las claves son las de los CSV (ya normalizadas).
export const META = { loss: 0.03, acc: 0.985 };
export const cumpleMeta = (loss, acc) => loss < META.loss && acc > META.acc;

const CANCER_BASE = {
  radius: "Radio",
  texture: "Textura",
  perimeter: "Perímetro",
  area: "Área",
  smoothness: "Suavidad",
  compactness: "Compacidad",
  concavity: "Concavidad",
  "concave points": "Puntos cóncavos",
  symmetry: "Simetría",
  "fractal dimension": "Dimensión fractal",
};

/** Devuelve { group: 'mean'|'error'|'worst', label } para una variable del dataset de cáncer. */
export function cancerField(key) {
  if (key.startsWith("mean ")) return { group: "mean", label: CANCER_BASE[key.slice(5)] };
  if (key.startsWith("worst ")) return { group: "worst", label: CANCER_BASE[key.slice(6)] };
  if (key.endsWith(" error")) return { group: "error", label: CANCER_BASE[key.slice(0, -6)] };
  throw new Error(`Variable de cáncer desconocida: ${key}`);
}

export const CANCER_GROUPS = [
  { id: "mean", title: "Valores promedio", hint: "Promedio de cada medida sobre todas las células de la imagen." },
  { id: "error", title: "Error estándar", hint: "Variabilidad (error estándar) de cada medida." },
  { id: "worst", title: "Peor valor", hint: "Valor más extremo (media de los 3 mayores) de cada medida." },
];

export const DIABETES_SYMPTOMS = {
  polyuria: "Poliuria (orinar con mucha frecuencia)",
  polydipsia: "Polidipsia (sed excesiva)",
  sudden_weight_loss: "Pérdida de peso repentina",
  weakness: "Debilidad",
  polyphagia: "Polifagia (hambre excesiva)",
  genital_thrush: "Candidiasis genital",
  visual_blurring: "Visión borrosa",
  itching: "Picazón",
  irritability: "Irritabilidad",
  delayed_healing: "Cicatrización lenta",
  partial_paresis: "Paresia parcial (debilidad muscular parcial)",
  muscle_stiffness: "Rigidez muscular",
  alopecia: "Alopecia (caída del cabello)",
  obesity: "Obesidad",
};

export const pct = (p, d = 1) => `${(p * 100).toFixed(d)} %`;
