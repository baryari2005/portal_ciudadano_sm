"use client";

import { StatusPage } from "@/components/status/StatusPage";

export default function DashboardError() {
  return (
    <StatusPage
      code="404"
      title="Ups, algo falló"
      description="Ocurrió un error inesperado en el dashboard."
      imageSrc="/404.png"
      primaryAction={{ label: "Volver al inicio", href: "/" }}
    />
  );
}
