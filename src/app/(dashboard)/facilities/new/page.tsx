"use client";

import AccessDenied403Page from "../../403/page";
import { EstablecimientoForm } from "@/features/establecimientos/components/EstablecimientoForm";
import { useCan } from "@/hooks/useCan";
import { Building2 } from "lucide-react";
import { AdminFormHeader } from "@/components/layout/admin-form-page";

export default function NewFacilityPage() {
  if (!useCan("establecimientos", "crear")) return <AccessDenied403Page />;

  return (
    <div className="grid min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full grid-rows-[auto_minmax(0,1fr)] gap-5 bg-[var(--brand-page)] p-4 sm:p-6 lg:h-[calc(100dvh-var(--topbar-h)-48px)] lg:overflow-hidden lg:p-8">
      <AdminFormHeader icon={Building2} title="Alta de establecimiento" description="Cargá los datos de la sede, sus datos de contacto y horarios." className="mb-0" />
      <div className="min-h-0 overflow-y-auto pr-2"><EstablecimientoForm mode="create" /></div>
    </div>
  );
}
