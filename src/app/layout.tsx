import { AppViewportGate } from "@/components/layout/AppViewportGate";
import { Toaster } from "@/components/ui/sonner";
import { Roboto } from "next/font/google";

import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-app-sans",
  display: "swap",
});

export const metadata = {
  title: "Portal Ciudadano | Sistema de Ayuda y Actividades ",
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
          {children}
          <Toaster />
        </AppViewportGate>
      </body>
    </html>
  );
}
