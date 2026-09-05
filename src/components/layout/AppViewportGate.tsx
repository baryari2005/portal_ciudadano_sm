"use client";

import { Suspense, type ReactNode, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import MobileUnsupported from "./MobileUnsupported";

type AppViewportGateProps = {
  children: ReactNode;
};

const DESKTOP_MIN_WIDTH = 900;

const AUTH_ROUTE_PREFIXES = [
  "/login",
  "/logout",
  "/reset-password",
  "/olvide-password",
  "/change-password",
  "/solicitar-acceso",
  "/request-access",
  "/acceso-pendiente",
  "/cuenta-pendiente",
  "/cuenta-rechazada",
  "/cuenta-bloqueada",
];

export function AppViewportGate({ children }: AppViewportGateProps) {
  return (
    <Suspense fallback={null}>
      <AppViewportGateContent>{children}</AppViewportGateContent>
    </Suspense>
  );
}

function AppViewportGateContent({ children }: AppViewportGateProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDesktop, setIsDesktop] = useState(true);
  const isAuthRoute = AUTH_ROUTE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const venueWorkspace = searchParams.get("workspace");
  const supportsVenueSelection =
    pathname === "/select-venue" &&
    (venueWorkspace === "teacher" || venueWorkspace === "reception");
  const supportsMobile =
    supportsVenueSelection ||
    ["/citizen", "/teacher", "/reception"].some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

  useEffect(() => {
    const updateViewport = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_MIN_WIDTH);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (pathname === "/" && !isDesktop) {
      window.location.replace("/login");
    }
  }, [isDesktop, pathname]);

  if (isAuthRoute || supportsMobile) {
    return <>{children}</>;
  }

  if (pathname === "/" && !isDesktop) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-[var(--brand-page)] px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-xl font-extrabold tracking-wide text-[var(--brand-primary)]">
            MÁS SAN MIGUEL
          </p>
          <p className="text-sm font-semibold text-[var(--brand-primary)]">
            Abriendo el portal ciudadano...
          </p>
        </div>
      </main>
    );
  }

  return isDesktop ? <>{children}</> : <MobileUnsupported />;
}
