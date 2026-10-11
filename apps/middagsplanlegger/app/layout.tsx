import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Middagsplanlegger",
  description: "Ukens middager for Evjeveien 28",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          maxWidth: 640,
          margin: "0 auto",
          padding: 16,
        }}
      >
        {children}
      </body>
    </html>
  );
}
