import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Empresta • Laboratório de APIs",
  description:
    "Controle o que você empresta e descubra como uma API funciona, na prática.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
