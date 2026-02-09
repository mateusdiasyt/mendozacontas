import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MendozaContas",
  description: "Copiloto financeiro pessoal e Arcade",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={jakarta.variable}>
      <body className="min-h-screen bg-surface-app font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
