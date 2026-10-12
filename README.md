# Momento 2 · Clasificación binaria con Keras desde cero

**Objetivo:** entrenar redes neuronales en Keras **sin modelos pre-entrenados** para clasificación binaria en dos datasets, y evaluar honestamente si se alcanza la meta **loss < 0.03 y accuracy > 0.985**.

1. **Cáncer de mama de Wisconsin** (`breast_cancer_wisconsin.csv`): tumor maligno (1) o benigno (0).
2. **Diabetes Early Stage** (`diabetes_data_upload.csv`, UCI): riesgo de diabetes a partir de síntomas. Reemplaza al dataset Pima, que se quedó en ~76 % (archivado).

## Estructura
```
data/        breast_cancer_wisconsin.csv, diabetes_data_upload.csv
notebooks/   01_cancer_wisconsin.ipynb, 02_diabetes_early_stage.ipynb
models/      model_*.keras, scaler_*.pkl, prep_*.pkl   (sufijos _cancer y _diabetes_early)
results/     history_*, busqueda_*, resultados_*, referencia_sklearn_*, comparativa_modelos_*
app/         (vacía: aquí irá el despliegue web)
_archivo/    material descartado (Pima, tabla comparativa antigua, notebooks previos); nada se borró
```

## Cómo ejecutar
```bash
pip install -r requirements.txt
cd notebooks
python -m nbconvert --to notebook --execute --inplace --ExecutePreprocessor.timeout=-1 01_cancer_wisconsin.ipynb
python -m nbconvert --to notebook --execute --inplace --ExecutePreprocessor.timeout=-1 02_diabetes_early_stage.ipynb
```
También se pueden abrir en Jupyter o en Google Colab (subir la carpeta del proyecto y ejecutar desde su raíz; las rutas son relativas). Tiempos aproximados en CPU: 01 ≈ 10–20 min, 02 ≈ 32 min.

Ambos notebooks tienen las mismas secciones: 0 Configuración · 1 Carga · 2 Limpieza · 3 Preparación · 4 Clusterización · 5 Modelo · 6 Búsqueda · 7 Validación cruzada · 8 Modelos de referencia · 9 Reporte honesto · 10 Gráficas · 11 Guardado · 12 `model.predict`.

## Metodología (resumen)
Partición estratificada 70/15/15 con semilla fija; escalado y KMeans ajustados solo con train; red densa y variante Conv1D con Dropout/L2, Adam, EarlyStopping y ReduceLROnPlateau; búsqueda aleatoria (26 candidatas generadas; en 02 se entrenan 14 para acortar el tiempo, ver el markdown de la sección 6 del notebook); validación cruzada; comparación con modelos de scikit-learn. **El test no se usa para elegir nada.** En Early Stage se eliminan antes de dividir las 269 filas duplicadas (quedan 251 únicas) para evitar fuga de datos.

## Resultados honestos (loss / accuracy)
| | Cáncer (Dense 128-64-32) | Diabetes Early Stage (Conv1D 16×5) |
|---|---|---|
| Train | 0.057 / 0.975 | 0.186 / 0.914 |
| Validación | 0.060 / 0.988 | 0.254 / 0.895 |
| Test | **0.016 / 1.000** (86 muestras) | 0.311 / 0.816 (38 muestras) |
| CV | 0.138 / 0.967 ± 0.020 (5 folds) | 0.329 / 0.867 ± 0.033 (5×3 folds) |
| ¿Cumple la meta? | **Solo en test**; no en validación (loss 0.060) ni en CV | **No, en ningún conjunto** |

* **Cáncer:** el 100 % en test con 86 muestras puede deberse a la partición; la estimación estable es la CV (~96.7 %, loss ≈ 0.14). La Regresión Logística obtiene una loss de CV menor (0.087) que la red.
* **Diabetes Early Stage:** techo honesto de ~87–93 % de accuracy en CV (SVM RBF 0.928, Random Forest 0.923). Recall en test 0.846 (4 falsos negativos de 26). Con los duplicados dejados el Random Forest llega a 0.987, pero es **fuga de datos** (61.5 % del test tiene copia exacta en train) y no es un resultado válido.
* Limitaciones de Early Stage: dataset pequeño, de un solo hospital y con variables autorreportadas. No es una herramienta de diagnóstico.
