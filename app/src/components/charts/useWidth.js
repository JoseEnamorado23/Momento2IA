"use client";
import { useEffect, useRef, useState } from "react";

/** Ancho real del contenedor (px). Los gráficos SVG se dibujan a ese ancho para que la tipografía no se encoja en móvil. */
export function useWidth(initial = 320) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}
