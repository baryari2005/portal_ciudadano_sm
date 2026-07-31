import type { Metadata } from "next";
import { StatusPage } from "@/components/status/StatusPage";

export const metadata: Metadata = { title: "No autorizado" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function NoAuthorizedPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const rawReason = params.reason;
  const reason = Array.isArray(rawReason) ? rawReason[0] : rawReason;
  const requiresSession = reason === "auth";

  return <StatusPage
    code={requiresSession ? "401" : "403"}
    title={requiresSession ? "Sesión requerida" : "Acceso denegado"}
    description={requiresSession ? "Necesitás iniciar sesión para acceder a esta página." : "Tu rol no tiene permisos para acceder a esta sección. Si creés que es un error, contactá a un administrador."}
    imageSrc={requiresSession ? "/401.png" : "/403.png"}
    primaryAction={requiresSession ? { label: "Iniciar sesión", href: "/login" } : { label: "Volver al inicio", href: "/" }}
    secondaryAction={requiresSession ? { label: "Volver al inicio", href: "/" } : { label: "Solicitar ayuda", href: "/soporte" }}
  />;
}
