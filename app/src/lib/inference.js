// Inferencia en JavaScript puro (sin dependencias) para los modelos Keras exportados a JSON.
// Capas soportadas: reshape, dense, conv1d, maxpool1d, global_avg_pool1d, batchnorm.
// Dropout no existe en inferencia. Activaciones: linear, relu, sigmoid, tanh, elu.

const ACT = {
  linear: (x) => x,
  relu: (x) => (x > 0 ? x : 0),
  sigmoid: (x) => 1 / (1 + Math.exp(-x)),
  tanh: (x) => Math.tanh(x),
  elu: (x) => (x > 0 ? x : Math.expm1(x)),
};

function activation(name) {
  const f = ACT[name];
  if (!f) throw new Error(`Activación no soportada: ${name}`);
  return f;
}

// Estado entre capas: { L, C, d } con d = Float64Array de L*C (un vector es L=1, C=n).
function dense(layer, s) {
  const { kernel: W, bias: b } = layer; // W[in][out]
  const nIn = W.length, nOut = b.length;
  if (s.d.length !== nIn) throw new Error(`Dense espera ${nIn} entradas y recibió ${s.d.length}`);
  const f = activation(layer.activation);
  const out = new Float64Array(nOut);
  for (let j = 0; j < nOut; j++) {
    let acc = b[j];
    for (let i = 0; i < nIn; i++) acc += s.d[i] * W[i][j];
    out[j] = f(acc);
  }
  return { L: 1, C: nOut, d: out };
}

function conv1d(layer, s) {
  const { kernel: K, bias: b, strides, padding } = layer; // K[k][cin][cout]
  const k = K.length, cin = K[0].length, cout = b.length;
  if (s.C !== cin) throw new Error(`Conv1D espera ${cin} canales y recibió ${s.C}`);
  let outL, padLeft;
  if (padding === "same") {
    outL = Math.ceil(s.L / strides);
    const total = Math.max((outL - 1) * strides + k - s.L, 0);
    padLeft = Math.floor(total / 2); // igual que TensorFlow
  } else {
    outL = Math.floor((s.L - k) / strides) + 1;
    padLeft = 0;
  }
  const f = activation(layer.activation);
  const out = new Float64Array(outL * cout);
  for (let t = 0; t < outL; t++) {
    for (let o = 0; o < cout; o++) {
      let acc = b[o];
      for (let j = 0; j < k; j++) {
        const pos = t * strides + j - padLeft;
        if (pos < 0 || pos >= s.L) continue; // relleno con ceros
        for (let c = 0; c < cin; c++) acc += s.d[pos * cin + c] * K[j][c][o];
      }
      out[t * cout + o] = f(acc);
    }
  }
  return { L: outL, C: cout, d: out };
}

function maxpool1d(layer, s) {
  const { pool, strides, padding } = layer;
  if (padding !== "valid") throw new Error("MaxPooling1D: solo padding 'valid'");
  const outL = Math.floor((s.L - pool) / strides) + 1;
  const out = new Float64Array(outL * s.C);
  for (let t = 0; t < outL; t++) {
    for (let c = 0; c < s.C; c++) {
      let m = -Infinity;
      for (let j = 0; j < pool; j++) m = Math.max(m, s.d[(t * strides + j) * s.C + c]);
      out[t * s.C + c] = m;
    }
  }
  return { L: outL, C: s.C, d: out };
}

function globalAvgPool1d(s) {
  const out = new Float64Array(s.C);
  for (let t = 0; t < s.L; t++) for (let c = 0; c < s.C; c++) out[c] += s.d[t * s.C + c];
  for (let c = 0; c < s.C; c++) out[c] /= s.L;
  return { L: 1, C: s.C, d: out };
}

function batchnorm(layer, s) {
  const out = new Float64Array(s.d.length);
  for (let i = 0; i < s.d.length; i++) {
    const c = i % s.C;
    out[i] = (layer.gamma[c] * (s.d[i] - layer.mean[c])) / Math.sqrt(layer.variance[c] + layer.epsilon) + layer.beta[c];
  }
  return { L: s.L, C: s.C, d: out };
}

function reshape(layer, s) {
  const [L, C] = layer.shape;
  if (L * C !== s.d.length) throw new Error("Reshape incompatible");
  return { L, C, d: s.d };
}

/** Propagación hacia adelante. `x` = vector ya preprocesado. Devuelve la probabilidad de la clase 1. */
export function predictProba(model, x) {
  let s = { L: 1, C: x.length, d: Float64Array.from(x) };
  for (const layer of model.layers) {
    switch (layer.type) {
      case "reshape": s = reshape(layer, s); break;
      case "dense": s = dense(layer, s); break;
      case "conv1d": s = conv1d(layer, s); break;
      case "maxpool1d": s = maxpool1d(layer, s); break;
      case "global_avg_pool1d": s = globalAvgPool1d(s); break;
      case "batchnorm": s = batchnorm(layer, s); break;
      default: throw new Error(`Capa no soportada: ${layer.type}`);
    }
  }
  if (s.d.length !== 1) throw new Error("La salida del modelo debe ser un único valor");
  return s.d[0];
}

/** Preprocesamiento idéntico al notebook: numéricas -> (x - media) / desviación; categóricas -> mapa (Yes/No, Gender). */
export function preprocess(preproc, input) {
  if (preproc.use_cluster) throw new Error("Este exportador no soporta modelos con cluster como variable");
  return preproc.features.map((f) => {
    const v = input[f.key];
    if (f.kind === "numeric") {
      const n = Number(v);
      if (v === "" || v === null || v === undefined || !Number.isFinite(n)) throw new Error(`Valor inválido en "${f.key}"`);
      return (n - f.mean) / f.scale;
    }
    if (f.kind === "map") {
      if (!(v in f.map)) throw new Error(`Valor inválido en "${f.key}": ${v}`);
      return f.map[v];
    }
    throw new Error(`Tipo de variable no soportado: ${f.kind}`);
  });
}

/** Entrada cruda (como en el formulario) -> probabilidad de la clase positiva. */
export function predictFromInput(model, preproc, input) {
  return predictProba(model, preprocess(preproc, input));
}
