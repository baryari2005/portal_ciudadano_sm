import { StatusPage } from "@/components/status/StatusPage";

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="Página no encontrada"
      description="La página que intentás ver no existe o todavía no está disponible."
      imageSrc="/404.png"
      primaryAction={{ label: "Ir al inicio", href: "/" }}
      secondaryAction={{ label: "Volver atrás", href: "#" }}
    />
  );
}
