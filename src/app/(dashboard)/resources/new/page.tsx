"use client";

import { useState } from "react";
import { Boxes } from "lucide-react";
import AccessDenied403Page from "../../403/page";
import { AdminFormHeader } from "@/components/layout/admin-form-page";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { ResourceForm } from "@/features/resources/components/ResourceForm";
import { useCan } from "@/hooks/useCan";

export default function NewResourcePage() {
  const canCreate = useCan("resources", "crear");
  const [loading, setLoading] = useState(true);
  if (!canCreate) return <AccessDenied403Page />;
  return <>{loading ? <CatalogLoadingState label="formulario de recurso" fullPage /> : null}<div className={loading ? "hidden" : undefined}><div className="grid min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full grid-rows-[auto_minmax(0,1fr)] gap-5 bg-[var(--brand-page)] p-4 sm:p-6 lg:h-[calc(100dvh-var(--topbar-h)-48px)] lg:overflow-hidden lg:p-8"><AdminFormHeader icon={Boxes} title="Alta de recurso físico" description="Cargá el recurso, su establecimiento y la forma en que participa de las reservas." className="mb-0" /><div className="min-h-0 overflow-y-auto pr-2"><ResourceForm mode="create" onLoadingChange={setLoading} /></div></div></div></>;
}
