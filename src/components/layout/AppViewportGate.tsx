"use client";

import { type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import MobileUnsupported from "./MobileUnsupported";

type AppViewportGateProps = {
  children: ReactNode;
};

const DESKTOP_MIN_WIDTH = 900;

const AUTH_ROUTE_PREFIXES = [
  "/login",
  "/logout",
  "/reset-password",
  "/change-password",
  "/solicitar-acceso",
  "/request-access",
  "/acceso-pendiente",
  "/cuenta-pendiente",
  "/cuenta-rechazada",
  "/cuenta-bloqueada",
];

export function AppViewportGate({ children }: AppViewportGateProps) {
  const pathname = usePathname();
  const [isDesktop, setIsDesktop] = useState(true);
  const isAuthRoute = AUTH_ROUTE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  useEffect(() => {
    const updateViewport = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_MIN_WIDTH);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return isDesktop ? <>{children}</> : <MobileUnsupported />;
}
