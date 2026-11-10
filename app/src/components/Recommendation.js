"use client";
import { useEffect, useState } from "react";
import { ARMS, loadState, resetState, selectArm, updateArm } from "../lib/bandit";

const armLabel = (id) => ARMS.find((a) => a.id === id)?.label ?? id;

/** Pipeline: predicción → prompt → LLM → recomendación. Luego el usuario califica y el bandido aprende. */
export default function Recommendation({ dataset, proba, context }) {
  const [state, setState] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | loading | ready | rated
  const [text, setText] = useState("");
  const [arm, setArm] = useState(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => { setState(loadState()); }, []);

  const generate = async () => {
    const s = loadState();
    const chosen = selectArm(s);
    setState(s); setArm(chosen); setPhase("loading"); setError(""); setRating(0);
    try {
      const res = await fetch("/api/recomendar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset, proba, context, style: chosen }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setText(data.text); setPhase("ready");
    } catch (e) {
      setError(e.message); setPhase("idle");
    }
  };

  const rate = (n) => {
    setRating(n);
    setState(updateArm(loadState(), arm, n));
    setPhase("rated");
  };

  return (
    <div className="reco" data-testid="reco">
      <h4 className="reco__title">Recomendación generada por IA</h4>
      {phase === "idle" && (
        <>
          <p className="hint">Un LLM recibe esta predicción como entrada y redacta recomendaciones.</p>
          <button type="button" className="btn btn--primary reco__btn" onClick={generate} data-testid="reco-generate">Generar recomendación</button>
        </>
      )}
      {error && <p className="alert" role="alert">{error}</p>}
      {phase === "loading" && <p className="status" data-testid="reco-loading">Generando recomendación…</p>}
      {(phase === "ready" || phase === "rated") && (
        <>
          <p className="reco__style">Estilo elegido por el agente: <strong>{armLabel(arm)}</strong></p>
          <div className="reco__text" data-testid="reco-text">{text}</div>
          <p className="reco__warn">Apoyo informativo; no sustituye la valoración de un profesional de la salud.</p>
          <div className="reco__rate" role="group" aria-label="Calificar la recomendación">
            <span>{phase === "rated" ? "¡Gracias! Tu calificación:" : "¿Qué tan útil fue?"}</span>
            <span className="stars" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={`star ${n <= (hover || rating) ? "star--on" : ""}`} disabled={phase === "rated"}
                        aria-label={`${n} de 5`} onMouseEnter={() => setHover(n)} onClick={() => rate(n)} data-testid={`star-${n}`}>★</button>
              ))}
            </span>
          </div>
          {phase === "rated" && (
            <button type="button" className="btn btn--link" onClick={generate} data-testid="reco-again">Generar otra recomendación</button>
          )}
        </>
      )}
      {state && ARMS.some((a) => state[a.id].n > 0) && (
        <details className="reco__stats">
          <summary>Qué ha aprendido el agente (aprendizaje por refuerzo)</summary>
          <p className="hint">Bandido multibrazo con Thompson sampling: cada estilo de prompt es un brazo; la calificación (1–5) es la recompensa. Los datos se guardan en este navegador.</p>
          <table>
            <thead><tr><th>Estilo</th><th>Usos</th><th>Calificación media</th><th>Valor estimado</th></tr></thead>
            <tbody>
              {ARMS.map((a) => {
                const s = state[a.id];
                return (
                  <tr key={a.id}>
                    <td>{a.label}</td><td>{s.n}</td>
                    <td>{s.n ? (s.sum / s.n).toFixed(2) : "—"}</td>
                    <td>{(s.alpha / (s.alpha + s.beta)).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="button" className="btn btn--link" onClick={() => setState(resetState())}>Reiniciar aprendizaje</button>
        </details>
      )}
    </div>
  );
}
