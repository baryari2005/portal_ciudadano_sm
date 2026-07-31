import { AccountStatusPage } from "@/features/auth/components/AccountStatusPage";

export default function CuentaPendientePage() {
  return (
    <AccountStatusPage
      title="Cuenta pendiente"
      message="Tu perfil fue completado correctamente. La cuenta queda pendiente de aprobación por un administrador."
    />
  );
}
