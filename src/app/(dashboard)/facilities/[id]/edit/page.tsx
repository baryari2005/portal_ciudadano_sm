"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AccessDenied403Page from "../../../403/page";
import Loading from "../../../loading";
import { EstablecimientoForm } from "@/features/establecimientos/components/EstablecimientoForm";
import { getEstablecimientoClient } from "@/features/establecimientos/services/establecimientos.service";
import type { Establecimiento } from "@/features/establecimientos/types/establecimiento.types";
import { useCan } from "@/hooks/useCan";
import { Building2 } from "lucide-react";
import { AdminFormHeader } from "@/components/layout/admin-form-page";

export default function EditFacilityPage() {
  const { id } = useParams<{ id: string }>();
  const canEdit = useCan("establecimientos", "editar");
  const [initial, setInitial] = useState<Establecimiento | null>(null);

  useEffect(() => { if (canEdit) void getEstablecimientoClient(id).then(setInitial); }, [canEdit, id]);
  if (!canEdit) return <AccessDenied403Page />;
  if (!initial) return <Loading />;

  return (
    <div className="grid min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full grid-rows-[auto_minmax(0,1fr)] gap-5 bg-[var(--brand-page)] p-4 sm:p-6 lg:h-[calc(100dvh-var(--topbar-h)-48px)] lg:overflow-hidden lg:p-8">
      <AdminFormHeader icon={Building2} title="Editar establecimiento" description="Actualizá los datos de la sede, sus datos de contacto y horarios." className="mb-0" />
      <div className="min-h-0 overflow-y-auto pr-2"><EstablecimientoForm mode="edit" defaultValues={initial} /></div>
    </div>
  );
}
