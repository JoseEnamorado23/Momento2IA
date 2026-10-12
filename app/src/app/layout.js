import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

// Una sola familia con ejes de ancho y tamaño óptico: títulos condensados, texto de lectura normal.
const ui = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz", "wdth"], display: "swap", variable: "--font-ui" });

export const metadata = {
  title: "Clasificadores con redes neuronales",
  description: "Cáncer de mama (Wisconsin) y diabetes (síntomas): redes neuronales entrenadas con Keras, con inferencia en el navegador.",
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#f3f1f8" };

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={ui.variable}>
      <body>{children}</body>
    </html>
  );
}
