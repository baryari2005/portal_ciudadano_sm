import { StatusPage } from "@/components/status/StatusPage";

export default function ComingSoonPage() {
  return (
    <StatusPage
      code="501"
      title="Sección en construcción"
      description="Estamos trabajando en esta sección. Volvé en unos días."
      imageSrc="/501.png"
      primaryAction={{ label: "Ir al inicio", href: "/" }}
    />
  );
}
