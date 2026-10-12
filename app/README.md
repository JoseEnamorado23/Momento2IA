# App web: clasificadores Keras en el navegador

Una sola página (Next.js) con dos pestañas, **Cáncer de mama (Wisconsin)** y **Diabetes (síntomas, Early Stage)**. La inferencia corre **en el navegador**: sin servidor de modelos y sin Python en producción. Los modelos se descargan una sola vez al abrir la página.

## Cómo se convirtieron los modelos (Plan B)
Se intentó primero `tensorflowjs_converter`, pero **falló**: la única versión instalable en este entorno (`tensorflowjs 3.18`) es incompatible con NumPy 2 y no lee el formato Keras 3 (`.keras`). Se usó el **Plan B**:

1. `scripts/export_models.py` lee `../models/*.keras`, `*.pkl` y `../results/*.json` (solo lectura), exporta los pesos y el preprocesamiento a JSON en `public/models/<dataset>/` y **copia los resultados** que usa la sección "Sobre el modelo" a `data/resultados_<dataset>.json`. Es el único archivo que sale de `app/`; la app en sí no depende de nada fuera de esta carpeta (el build se comprobó copiando `app/` sola a otra ubicación).
2. `src/lib/inference.js` implementa en JavaScript puro la propagación hacia adelante (Dense, Conv1D, MaxPooling1D, GlobalAveragePooling1D, BatchNormalization, activaciones relu/sigmoide/tanh/elu). Dropout no existe en inferencia.
3. El preprocesamiento (media y desviación del `StandardScaler`, orden de columnas, mapeos Yes/No y Gender) se aplica igual que en los notebooks. Ninguno de los dos modelos usa el cluster como variable.

## Verificación Python vs. JS
`npm test` compara la probabilidad de Keras (Python) con la de JS sobre **todas las filas de test** de cada dataset (86 de cáncer y 38 de diabetes; fixtures en `test/fixtures/`) y sobre dos redes sintéticas con BatchNorm/tanh/elu/padding `same` y `valid`. Falla si alguna diferencia es ≥ 1e-4 o cambia la clase. Resultado actual: diferencia máxima 4.8e-8 (cáncer) y 8.6e-8 (diabetes).

## Correr en local
```bash
cd app
npm install
npm run dev          # http://localhost:3000
npm test             # verificación Python vs JS
npm run build && npm start   # versión de producción
```
Si el puerto 3000 está ocupado (p. ej. por un `portproxy` hacia WSL): `npm run dev -- -p 3100`.

## Reconvertir los modelos si se reentrenan
1. Reentrena en los notebooks (se actualizan `models/` y `results/`).
2. Desde la raíz del proyecto, con el entorno donde está TensorFlow:
   ```bash
   python app/scripts/export_models.py     # o: cd app && npm run export
   npm test --prefix app
   ```
   El script regenera `public/models/*`, `data/*` y los fixtures, **reproduce el split de test y comprueba que coincide con las métricas de `results/`** (si no coincide, se detiene).
   Después, `git add app/data app/public app/test` y *commit* para que Vercel despliegue los modelos nuevos.
3. Limitaciones del exportador: solo modelos secuenciales con las capas listadas arriba (otra capa lanza un error explícito) y sin cluster como variable (si `usa_cluster` es verdadero, se detiene). Si cambia el dataset o el preprocesamiento hay que ajustar `export_models.py` y los textos de `src/lib/labels.js`.

## Desplegar en Vercel
La carpeta a desplegar es `app/` (el repositorio contiene todo el proyecto). `public/models/` ya está generado y **debe estar en el repositorio**.

**Desde GitHub:** sube el proyecto → en Vercel, *Add New… → Project* → importa el repositorio → **Root Directory: `app`** → Framework: Next.js (se detecta solo) → *Deploy*.

**Con la CLI:**
```bash
npm i -g vercel
cd app
vercel          # primera vez: vincula el proyecto (Root = carpeta actual)
vercel --prod
```
No requiere variables de entorno ni claves. Los modelos pesan ~250 KB en total.

## Estructura
```
app/
├── data/                              resultados_*.json (copia de results/: métricas y gráficas)
│                                      graficas_*.json (historial, matriz de confusión, CV vs sklearn)
├── public/models/{cancer,diabetes}/   model.json, preproc.json, examples.json
├── src/app/                           layout, página (pestañas) y estilos
├── src/components/                    formularios, tarjeta de resultado, "Sobre el modelo"
├── src/components/charts/             gráficas en SVG/CSS propio (sin librerías), carga diferida
├── src/lib/                           inference.js (JS puro), info.js (métricas), carga de modelos, etiquetas
├── scripts/export_models.py           exportador Keras -> JSON
└── test/                              verify.mjs y fixtures
```

## Gráficas del modelo
Cada pestaña tiene cuatro gráficas, dibujadas con SVG/CSS propio (sin dependencias nuevas) y cargadas de forma diferida (no se descargan hasta que se acercan a la pantalla):
1. Loss y accuracy por época (entrenamiento continuo, validación discontinua) con la línea de la **Meta** (0.03 y 98.5 %) y la época cuyos pesos se conservaron (`EarlyStopping` con `restore_best_weights`).
2. Matriz de confusión del test.
3. Accuracy en validación cruzada (media ± desviación) de la red Keras frente a Regresión Logística, SVM, Random Forest y Gradient Boosting (eje desde 50 %).
4. Tabla con loss y accuracy en train, validación, test y CV, indicando si se cumple la meta (en "Sobre el modelo").

Los datos salen de `results/` (`history_*.csv`, `comparativa_modelos_*.csv`, `resultados_*.json`) y se copian a `data/graficas_*.json` con `python scripts/export_models.py`. La matriz de confusión se **recalcula** con el modelo y el split exportados y el script se detiene si no coincide con el reporte del notebook. En diabetes la loss de las curvas incluye la penalización L2 de Keras, por eso difiere un poco de la loss de la tabla.

## Limitaciones
* Las métricas mostradas en "Sobre el modelo" se importan de `data/resultados_*.json` (copia de `results/resultados_*.json`): la meta (loss < 0.03 y accuracy > 0.985) **no se cumple en validación ni en CV** en ninguno de los dos modelos (en cáncer solo en test, con 86 muestras; en diabetes en ningún conjunto).
* Los ejemplos son filas reales del test; el modelo de diabetes se entrenó con 251 pacientes únicos de un solo hospital y síntomas autorreportados.
* Los rangos del formulario de cáncer son "razonables" (0 a 1.5× el máximo del dataset), no límites clínicos.
