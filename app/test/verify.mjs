// Verificación: probabilidad de Keras (Python) vs. implementación JS. Falla si alguna diferencia >= tolerancia.
// Ejecutar con:  npm test   (o:  node test/verify.mjs)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { predictFromInput, predictProba } from "../src/lib/inference.js";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(here, p), "utf8"));
const TABLE_ROWS = 12;
let failed = false;

for (const [name, dir] of [["Cáncer", "cancer"], ["Diabetes Early Stage", "diabetes"]]) {
  const model = read(`../public/models/${dir}/model.json`);
  const preproc = read(`../public/models/${dir}/preproc.json`);
  const { rows, tolerance } = read(`fixtures/${dir}.json`);
  const diffs = rows.map((r) => Math.abs(predictFromInput(model, preproc, r.input) - r.expected));
  console.log(`\n=== ${name}: ${rows.length} filas de test (se muestran ${TABLE_ROWS}) ===`);
  console.table(
    rows.slice(0, TABLE_ROWS).map((r, i) => ({
      fila: r.id, "real": r.label, "Keras (Python)": r.expected.toFixed(8),
      "JS": predictFromInput(model, preproc, r.input).toFixed(8), "|diff|": diffs[i].toExponential(2),
    }))
  );
  const maxDiff = Math.max(...diffs);
  const same = rows.every((r, i) => (predictFromInput(model, preproc, r.input) >= 0.5) === (r.expected >= 0.5));
  const ok = maxDiff < tolerance && same;
  console.log(`Filas: ${rows.length} | diferencia máxima: ${maxDiff.toExponential(3)} (tolerancia ${tolerance}) | misma clase en todas: ${same} -> ${ok ? "OK" : "FALLA"}`);
  if (!ok) failed = true;
}

// Auto-prueba: redes sintéticas con BatchNorm, tanh/elu, padding same/valid (garantiza soporte para reconversiones futuras)
const { cases, tolerance } = read("fixtures/selftest.json");
console.log("\n=== Auto-prueba con redes sintéticas ===");
for (const c of cases) {
  const maxDiff = Math.max(...c.inputs.map((x, i) => Math.abs(predictProba(c.model, x) - c.expected[i])));
  const ok = maxDiff < tolerance;
  console.log(`${c.name}: diferencia máxima ${maxDiff.toExponential(3)} -> ${ok ? "OK" : "FALLA"}`);
  if (!ok) failed = true;
}

console.log(failed ? "\nVERIFICACIÓN FALLIDA" : "\nVERIFICACIÓN CORRECTA: Python y JS coinciden (< 1e-4).");
process.exit(failed ? 1 : 0);
