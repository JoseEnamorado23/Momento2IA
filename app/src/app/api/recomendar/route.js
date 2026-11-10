import { buildMessages, isDataset, STYLES } from "../../../lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

// LLM_PROVIDER define el endpoint (todos compatibles con la API de chat de OpenAI). LLM_MODEL es opcional.
const PROVIDERS = {
  grok: { url: "https://api.x.ai/v1/chat/completions", model: "grok-3-mini" },
  xai: { url: "https://api.x.ai/v1/chat/completions", model: "grok-3-mini" },
  openai: { url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
  gemini: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", model: "gemini-2.5-flash" },
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

  try {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || provider.model,
        messages: buildMessages({ dataset, proba, context: safe, style }),
        temperature: 0.7,
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(50000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return bad(`El proveedor LLM respondió ${res.status}: ${data?.error?.message || data?.error || "error"}`, 502);
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return bad("El LLM devolvió una respuesta vacía", 502);
    return Response.json({ text, model: data.model ?? null });
  } catch (e) {
    return bad(`No se pudo contactar al LLM: ${e.message}`, 502);
  }
}
