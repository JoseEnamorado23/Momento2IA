import { buildMessages, isDataset, STYLES } from "../../../lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

// LLM_PROVIDER define el endpoint (todos compatibles con la API de chat de OpenAI). LLM_MODEL es opcional.
const PROVIDERS = {
  grok: { url: "https://api.x.ai/v1/chat/completions", model: "grok-3-mini" },
  xai: { url: "https://api.x.ai/v1/chat/completions", model: "grok-3-mini" },
  openai: { url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
  gemini: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: "gemini-3.8-flash", fallback: "gemini-3.5-flash-lite" },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", model: "meta-llama/llama-3.3-70b-instruct:free" },
};

const bad = (msg, status = 400) => Response.json({ error: msg }, { status });

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return bad("JSON inválido"); }
  const { dataset, proba, context, style } = body ?? {};
  if (!isDataset(dataset)) return bad("Dataset inválido");
  if (typeof proba !== "number" || !(proba >= 0 && proba <= 1)) return bad("Probabilidad inválida");
  if (!Object.hasOwn(STYLES, style)) return bad("Estilo inválido");
  if (!context || typeof context !== "object" || Array.isArray(context) || Object.keys(context).length > 40) return bad("Contexto inválido");
  const safe = {};
  for (const [k, v] of Object.entries(context)) {
    if (typeof v === "string" || typeof v === "number") safe[String(k).slice(0, 60)] = String(v).slice(0, 60);
  }

  const apiKey = process.env.LLM_API_KEY;
  const name = (process.env.LLM_PROVIDER || "grok").toLowerCase();
  const provider = PROVIDERS[name];
  if (!apiKey) return bad("Falta la variable de entorno LLM_API_KEY en el servidor", 500);
  if (!provider) return bad(`LLM_PROVIDER desconocido: ${name}`, 500);

  // Reintentos ante saturación (429/5xx) y, si existe, modelo de respaldo. Presupuesto total < maxDuration.
  const primary = process.env.LLM_MODEL || provider.model;
  const models = [primary, ...(provider.fallback && provider.fallback !== primary ? [provider.fallback] : [])];
  const messages = buildMessages({ dataset, proba, context: safe, style });
  const deadline = Date.now() + 52000;
  const RETRYABLE = new Set([429, 500, 502, 503, 504]);
  let lastError = "sin intentos";

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const left = deadline - Date.now();
      if (left < 3000) return bad(`El LLM tardó demasiado. Último error: ${lastError}`, 504);
      try {
        const res = await fetch(provider.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1500 }),
          signal: AbortSignal.timeout(Math.min(left, 25000)),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const text = data?.choices?.[0]?.message?.content?.trim();
          if (text) return Response.json({ text, model: data.model ?? model });
          lastError = `(${name}, ${model}) respuesta vacía`;
          break; // pasa al siguiente modelo
        }
        // Gemini a veces devuelve un arreglo [{ error: {...} }]; se normaliza para mostrar el motivo real.
        const err = (Array.isArray(data) ? data[0] : data)?.error ?? data;
        const msg = typeof err === "string" ? err : err?.message || JSON.stringify(err).slice(0, 300);
        lastError = `(${name}, modelo ${model}) respondió ${res.status}: ${msg}`;
        if (!RETRYABLE.has(res.status)) return bad(`El proveedor LLM ${lastError}`, 502);
      } catch (e) {
        lastError = `(${name}, modelo ${model}) ${e.message}`;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return bad(`El proveedor LLM no respondió tras reintentos. Último error: ${lastError}`, 502);
}
