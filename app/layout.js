import "./globals.css";

export const metadata = {
  title: "Sistema Cooperativa",
  description: "Gestion de rendiciones, almacen y socios",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
