import type { Metadata } from "next";
import "@/index.css";

export const metadata: Metadata = {
  title: "Garagem CRM",
  description: "CRM operacional da Garagem.",
  icons: {
    icon: [
      { url: "/logo-garagem.png", type: "image/png" },
      { url: "/logo-garagem.svg", type: "image/svg+xml" },
    ],
    apple: "/logo-garagem.png",
    shortcut: "/logo-garagem.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
