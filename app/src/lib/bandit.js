// Aprendizaje por refuerzo: bandido multibrazo con Thompson sampling (Beta-Bernoulli).
// Cada "brazo" es un estilo de prompt para el LLM. La recompensa es la calificación del usuario
// normalizada a [0, 1]. El estado se guarda en localStorage (en Vercel el servidor no persiste nada).
export const ARMS = [
  { id: "conciso", label: "Conciso", desc: "Pocos puntos, directo" },
  { id: "detallado", label: "Detallado", desc: "Explica el porqué de cada paso" },
  { id: "empatico", label: "Empático", desc: "Tono cercano y tranquilizador" },
];

const KEY = "m2ia-bandit-v1";
const fresh = () => Object.fromEntries(ARMS.map((a) => [a.id, { alpha: 1, beta: 1, n: 0, sum: 0 }]));

export function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && ARMS.every((a) => s[a.id] && Number.isFinite(s[a.id].alpha))) return s;
  } catch {}
  return fresh();
}
const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
export const resetState = () => { const s = fresh(); save(s); return s; };

// Muestreo Gamma (Marsaglia-Tsang) para construir la Beta(alpha, beta).
function gaussian() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function gamma(k) {
  if (k < 1) return gamma(k + 1) * Math.random() ** (1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { x = gaussian(); v = 1 + c * x; } while (v <= 0);
    v = v ** 3;
    const u = Math.random();
    if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v;
  }
}
const beta = (a, b) => { const x = gamma(a), y = gamma(b); return x / (x + y); };

/** Elige el brazo con mayor muestra de su posterior Beta (explora al inicio, explota con el tiempo). */
export function selectArm(state) {
  let best = ARMS[0].id, bestV = -1;
  for (const a of ARMS) {
    const v = beta(state[a.id].alpha, state[a.id].beta);
    if (v > bestV) { bestV = v; best = a.id; }
  }
  return best;
}

/** Actualiza con la recompensa r = (calificación − 1) / 4. Devuelve el nuevo estado. */
export function updateArm(state, armId, rating) {
  const r = (rating - 1) / 4;
  const s = { ...state, [armId]: { ...state[armId] } };
  const a = s[armId];
  a.alpha += r; a.beta += 1 - r; a.n += 1; a.sum += rating;
  save(s);
  return s;
}
