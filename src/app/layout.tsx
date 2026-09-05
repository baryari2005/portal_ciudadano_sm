import { AppViewportGate } from "@/components/layout/AppViewportGate";
import { Toaster } from "@/components/ui/sonner";
import { Roboto } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { PwaServiceWorkerRegistrar } from "@/components/pwa/PwaServiceWorkerRegistrar";

import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-app-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portal Ciudadano | Sistema de Ayuda y Actividades",
  description: "Portal de actividades y servicios de MÁS San Miguel.",
  manifest: "/manifest.webmanifest",
  applicationName: "MÁS San Miguel",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MÁS",
  },
  icons: {
    icon: [
      { url: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1D4F36",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={roboto.variable}>
      <body className="font-sans antialiased">
        <AppViewportGate>
          <PwaServiceWorkerRegistrar />
          {children}
          <Toaster />
        </AppViewportGate>
      </body>
    </html>
  );
}
