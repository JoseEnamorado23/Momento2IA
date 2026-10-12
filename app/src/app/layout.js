import "./globals.css";

export const metadata = {
  title: "Clasificadores Keras en el navegador",
  description: "Cáncer de mama (Wisconsin) y diabetes (síntomas): redes neuronales entrenadas con Keras, con inferencia en el navegador. Herramienta académica.",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
