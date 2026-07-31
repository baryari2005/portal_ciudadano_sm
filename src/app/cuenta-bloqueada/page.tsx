import { AccountStatusPage } from "@/features/auth/components/AccountStatusPage";

export default function CuentaBloqueadaPage() {
  return (
    <AccountStatusPage
      title="Cuenta bloqueada"
      message="Tu cuenta está bloqueada. Contactá al equipo administrador para recuperar el acceso."
    />
  );
}
