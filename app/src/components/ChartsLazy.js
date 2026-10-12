"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const Charts = dynamic(() => import("./charts/Charts"), {
  ssr: false,
  loading: () => <p className="status">Cargando gráficas…</p>,
});

/** No descarga ni dibuja las gráficas hasta que el hueco se acerca a la pantalla, para no retrasar el formulario. */
export default function ChartsLazy({ dataset }) {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setNear(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className="charts-slot">{near && <Charts dataset={dataset} />}</div>;
}
