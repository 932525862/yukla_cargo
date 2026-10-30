import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Cargo Tracker",
  description: "Xitoydan O'zbekistonga yuk tashish nazorati",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.png", apple: "/icons/Icon-192.png" },
  appleWebApp: { capable: true, title: "Cargo Tracker", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0251FD",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="min-h-dvh font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
