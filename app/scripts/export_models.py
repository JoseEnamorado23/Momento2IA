"""Exporta los modelos Keras ya entrenados a JSON para inferencia en el navegador (Plan B, sin TensorFlow.js).

Solo LEE models/, results/ y data/ (no reentrena nada ni los modifica). Escribe en:
  app/public/models/<dataset>/{model.json, preproc.json, examples.json}
  app/data/resultados_<dataset>.json   (copia de results/, usada por la sección "Sobre el modelo")
  app/test/fixtures/{cancer,diabetes,selftest}.json

Uso (desde la raíz del proyecto, con el entorno donde está TensorFlow):
  python app/scripts/export_models.py
"""
import json, os, shutil, sys
from pathlib import Path

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
import joblib
import numpy as np
import pandas as pd
import keras
from sklearn.metrics import log_loss
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "app"
SEED = 42
N_FIXTURES_TABLE = 12


# ------------------------------------------------------------------ utilidades
def clean(a):
    """float32 -> lista de floats con 9 cifras significativas (ida y vuelta exacta para float32)."""
    a = np.asarray(a, dtype=np.float32).astype(np.float64)
    return np.vectorize(lambda v: float("%.9g" % v))(a).tolist() if a.ndim else float("%.9g" % a)


def write_json(path, obj, indent=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":") if indent is None else None, indent=indent)


def export_layers(model):
    """Convierte un modelo Keras secuencial a una lista de capas JSON. Falla si hay capas no soportadas."""
    out = []
    for l in model.layers:
        t = type(l).__name__
        if t in ("InputLayer", "Dropout"):
            continue                                   # Dropout no hace nada en inferencia
        if t == "Reshape":
            out.append({"type": "reshape", "shape": [int(v) for v in l.target_shape]})
        elif t == "Dense":
            k, b = l.get_weights()
            out.append({"type": "dense", "activation": l.activation.__name__, "kernel": clean(k), "bias": clean(b)})
        elif t == "Conv1D":
            assert l.dilation_rate == (1,) and l.groups == 1, "Conv1D con dilation/groups no soportada"
            k, b = l.get_weights()
            out.append({"type": "conv1d", "activation": l.activation.__name__, "padding": l.padding,
                        "strides": int(l.strides[0]), "kernel": clean(k), "bias": clean(b)})
        elif t == "MaxPooling1D":
            out.append({"type": "maxpool1d", "pool": int(l.pool_size[0]), "strides": int(l.strides[0]), "padding": l.padding})
        elif t == "GlobalAveragePooling1D":
            out.append({"type": "global_avg_pool1d"})
        elif t == "BatchNormalization":
            assert l.axis in (-1, [-1], (-1,)) or l.axis == len(l.input.shape) - 1, "BatchNorm solo sobre el último eje"
            ch = int(l.moving_mean.shape[0])
            gamma = l.gamma.numpy() if l.gamma is not None else np.ones(ch, np.float32)
            beta = l.beta.numpy() if l.beta is not None else np.zeros(ch, np.float32)
            out.append({"type": "batchnorm", "gamma": clean(gamma), "beta": clean(beta), "mean": clean(l.moving_mean.numpy()),
                        "variance": clean(l.moving_variance.numpy()), "epsilon": float(l.epsilon)})
        else:
            raise ValueError(f"Capa no soportada para exportar: {t}")
    return out


def describe(layers_json, n_in):
    parts = [f"entrada {n_in}"]
    for L in layers_json:
        if L["type"] == "dense":
            parts.append(f"Dense {len(L['bias'])} ({L['activation']})")
        elif L["type"] == "conv1d":
            parts.append(f"Conv1D {len(L['bias'])} filtros k={len(L['kernel'])} ({L['activation']}, {L['padding']})")
        elif L["type"] == "maxpool1d":
            parts.append(f"MaxPool {L['pool']}")
        elif L["type"] == "global_avg_pool1d":
            parts.append("GlobalAvgPool")
        elif L["type"] == "batchnorm":
            parts.append("BatchNorm")
        elif L["type"] == "reshape":
            parts.append("Reshape")
    return " → ".join(parts)


def predict_keras(model, A):
    return model.predict(A.astype("float32"), verbose=0).ravel().astype(np.float64)


def fixture_rows(X_raw, y, proba, to_input):
    rows = []
    for i, (idx, r) in enumerate(X_raw.iterrows()):
        rows.append({"id": int(idx), "input": to_input(r), "label": int(y[i]), "expected": float(proba[i])})
    return rows


def pick_examples(rows):
    neg = next(r for r in rows if r["label"] == 0)
    pos = next(r for r in rows if r["label"] == 1)
    return {"negative": neg, "positive": pos}


# ------------------------------------------------------------------ Cáncer
def export_cancer():
    model = keras.models.load_model(ROOT / "models" / "model_cancer.keras")
    prep = joblib.load(ROOT / "models" / "prep_cancer.pkl")
    scaler = prep["scaler"]
    res = json.load(open(ROOT / "results" / "resultados_cancer.json", encoding="utf-8"))
    assert res["usa_cluster"] is False, "El modelo usa cluster: el exportador no lo soporta"

    df = pd.read_csv(ROOT / "data" / "breast_cancer_wisconsin.csv").drop(columns=["id"])
    df["diagnosis"] = (df["diagnosis"] == "M").astype(int)
    FEATURES = [c for c in df.columns if c != "diagnosis"]
    assert list(scaler.feature_names_in_) == FEATURES, "Orden de columnas del scaler distinto al CSV"
    X, y = df[FEATURES], df["diagnosis"].values
    X_tr, X_tmp, y_tr, y_tmp = train_test_split(X, y, test_size=0.30, stratify=y, random_state=SEED)
    X_va, X_te, y_va, y_te = train_test_split(X_tmp, y_tmp, test_size=0.50, stratify=y_tmp, random_state=SEED)

    A = scaler.transform(X_te)
    p = predict_keras(model, A)
    l = log_loss(y_te, np.clip(p, 1e-7, 1 - 1e-7), labels=[0, 1]); a = float(((p >= 0.5) == y_te).mean())
    print(f"[cáncer] test reproducido: loss={l:.4f} acc={a:.4f} | notebook: loss={res['test']['loss']:.4f} acc={res['test']['accuracy']:.4f}")
    assert abs(l - res["test"]["loss"]) < 1e-3 and abs(a - res["test"]["accuracy"]) < 1e-9, "La partición de test no coincide con el notebook"

    layers = export_layers(model)
    ranges = {}
    for c in FEATURES:
        assert df[c].min() >= 0
        ranges[c] = [0, float("%.6g" % (df[c].max() * 1.5))]
    preproc = {"features": [{"key": c, "kind": "numeric", "mean": float(m), "scale": float(s)}
                            for c, m, s in zip(FEATURES, scaler.mean_, scaler.scale_)],
               "use_cluster": False, "ranges": ranges,
               "typical": {c: [float("%.6g" % df[c].quantile(.05)), float("%.6g" % df[c].quantile(.95))] for c in FEATURES}}
    rows = fixture_rows(X_te, y_te, p, lambda r: {k: float(v) for k, v in r.items()})
    base = APP / "public" / "models" / "cancer"
    write_json(base / "model.json", {"name": "cancer", "n_inputs": len(FEATURES), "layers": layers})
    write_json(base / "preproc.json", preproc)
    write_json(base / "examples.json", pick_examples(rows), indent=1)
    copy_results(res_name="cancer")
    print("[cáncer] arquitectura:", describe(layers, len(FEATURES)))
    write_json(APP / "test" / "fixtures" / "cancer.json", {"rows": rows, "tolerance": 1e-4}, indent=None)
    return p


# ------------------------------------------------------------------ Diabetes Early Stage
def export_diabetes():
    model = keras.models.load_model(ROOT / "models" / "model_diabetes_early.keras")
    prep = joblib.load(ROOT / "models" / "prep_diabetes_early.pkl")
    scaler = prep["scaler"]                                   # aplica SOLO a 'age'
    res = json.load(open(ROOT / "results" / "resultados_diabetes_early.json", encoding="utf-8"))
    assert res["usa_cluster"] is False, "El modelo usa cluster: el exportador no lo soporta"

    raw = pd.read_csv(ROOT / "data" / "diabetes_data_upload.csv")
    raw.columns = [c.strip().lower().replace(" ", "_") for c in raw.columns]
    df = raw.copy()
    for c in df.columns:
        if c == "age": continue
        if c == "gender":  df[c] = df[c].map({"Male": 1, "Female": 0})
        elif c == "class": df[c] = df[c].map({"Positive": 1, "Negative": 0})
        else:              df[c] = df[c].map({"Yes": 1, "No": 0})
    df = df.astype(int)
    FEATURES = [c for c in df.columns if c != "class"]
    df_u = df.drop_duplicates().reset_index(drop=True)
    X, y = df_u[FEATURES], df_u["class"].values
    X_tr, X_tmp, y_tr, y_tmp = train_test_split(X, y, test_size=0.30, stratify=y, random_state=SEED)
    X_va, X_te, y_va, y_te = train_test_split(X_tmp, y_tmp, test_size=0.50, stratify=y_tmp, random_state=SEED)
    assert list(scaler.feature_names_in_) == ["age"]

    def transform(Xr):                                         # idéntico a transform_prep del notebook
        Z = Xr.copy(); Z["age"] = scaler.transform(Xr[["age"]]).ravel()
        return Z.values.astype("float32")

    p = predict_keras(model, transform(X_te))
    l = log_loss(y_te, np.clip(p, 1e-7, 1 - 1e-7), labels=[0, 1]); a = float(((p >= 0.5) == y_te).mean())
    print(f"[diabetes] test reproducido: loss={l:.4f} acc={a:.4f} | notebook: loss={res['test']['loss']:.4f} acc={res['test']['accuracy']:.4f}")
    assert abs(l - res["test"]["loss"]) < 1e-3 and abs(a - res["test"]["accuracy"]) < 1e-9, "La partición de test no coincide con el notebook"

    layers = export_layers(model)
    feats = []
    for c in FEATURES:
        if c == "age":
            feats.append({"key": c, "kind": "numeric", "mean": float(scaler.mean_[0]), "scale": float(scaler.scale_[0])})
        elif c == "gender":
            feats.append({"key": c, "kind": "map", "map": {"Male": 1, "Female": 0}})
        else:
            feats.append({"key": c, "kind": "map", "map": {"Yes": 1, "No": 0}})
    preproc = {"features": feats, "use_cluster": False, "ranges": {"age": [1, 120]}}

    def to_input(r):
        d = {}
        for c in FEATURES:
            d[c] = int(r[c]) if c == "age" else (("Male" if r[c] == 1 else "Female") if c == "gender" else ("Yes" if r[c] == 1 else "No"))
        return d
    rows = fixture_rows(X_te, y_te, p, to_input)
    base = APP / "public" / "models" / "diabetes"
    write_json(base / "model.json", {"name": "diabetes_early", "n_inputs": len(FEATURES), "layers": layers})
    write_json(base / "preproc.json", preproc)
    write_json(base / "examples.json", pick_examples(rows), indent=1)
    copy_results(res_name="diabetes_early")
    print("[diabetes] arquitectura:", describe(layers, len(FEATURES)))
    write_json(APP / "test" / "fixtures" / "diabetes.json", {"rows": rows, "tolerance": 1e-4}, indent=None)
    return p


def copy_results(res_name):
    """Copia (sin cambios) los resultados que muestra la sección "Sobre el modelo" a app/data/, para que app/ sea autónoma."""
    src = ROOT / "results" / f"resultados_{res_name}.json"
    dst = APP / "data" / src.name
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)


# ------------------------------------------------------------------ Auto-prueba con una red sintética (Dense/Conv1D/BatchNorm/activaciones)
def export_selftest():
    from keras import layers as L
    rng = np.random.RandomState(0)
    cases = []
    specs = {
        "mlp_bn_tanh_elu": lambda: keras.Sequential([L.Input((6,)), L.Dense(8, activation="tanh"), L.BatchNormalization(),
                                                      L.Dense(5, activation="elu"), L.Dropout(0.3), L.Dense(1, activation="sigmoid")]),
        "conv_bn_valid": lambda: keras.Sequential([L.Input((10,)), L.Reshape((10, 1)), L.Conv1D(4, 3, padding="same", activation="relu"),
                                                    L.BatchNormalization(), L.MaxPooling1D(2), L.Conv1D(3, 3, padding="valid", activation="tanh"),
                                                    L.GlobalAveragePooling1D(), L.Dense(1, activation="sigmoid")]),
    }
    for name, mk in specs.items():
        m = mk()
        for w in m.weights:                                    # pesos y estadísticas BN aleatorios (no triviales)
            v = rng.randn(*w.shape).astype("float32") * 0.7
            if "variance" in w.path: v = np.abs(v) + 0.3
            w.assign(v)
        n_in = m.input_shape[1]
        X = rng.randn(8, n_in).astype("float32")
        cases.append({"name": name, "model": {"n_inputs": n_in, "layers": export_layers(m)}, "inputs": clean(X),
                      "expected": predict_keras(m, X).tolist()})
    write_json(APP / "test" / "fixtures" / "selftest.json", {"cases": cases, "tolerance": 1e-4})
    print(f"[selftest] {len(cases)} redes sintéticas exportadas")


if __name__ == "__main__":
    export_cancer()
    export_diabetes()
    export_selftest()
    print("Exportación completa.")
