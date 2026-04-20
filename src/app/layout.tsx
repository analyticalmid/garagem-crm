import type { Metadata } from "next";
import "@/index.css";

export const metadata: Metadata = {
  title: "Garagem CRM",
  description: "CRM operacional da Garagem.",
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
