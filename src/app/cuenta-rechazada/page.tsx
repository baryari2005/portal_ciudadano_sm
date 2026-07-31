import { AccountStatusPage } from "@/features/auth/components/AccountStatusPage";

export default function CuentaRechazadaPage() {
  return (
    <AccountStatusPage
      title="Cuenta rechazada"
      message="Tu cuenta fue rechazada. Si creés que se trata de un error, contactá al equipo administrador."
    />
  );
}
