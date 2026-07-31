import { StatusPage } from "@/components/status/StatusPage";

export default function DashboardNotFoundPage() {
  return <StatusPage
    code="404"
    title="Página no encontrada"
    description="No encontramos esta sección. La página no existe o todavía no está disponible."
    imageSrc="/404.png"
    primaryAction={{ label: "Volver al inicio", href: "/" }}
    secondaryAction={{ label: "Solicitar ayuda", href: "/soporte" }}
  />;
}
