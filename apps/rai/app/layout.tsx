import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digidactics AI Platform",
  description: "SAI en RouteAI learning foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
