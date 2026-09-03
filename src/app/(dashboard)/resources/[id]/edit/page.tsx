"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Boxes } from "lucide-react";
import AccessDenied403Page from "../../../403/page";
import { AdminFormHeader } from "@/components/layout/admin-form-page";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { ResourceForm } from "@/features/resources/components/ResourceForm";
import { getResourceClient } from "@/features/resources/services/resources.service";
import type { Resource } from "@/features/resources/types/resource.types";
import { useCan } from "@/hooks/useCan";

export default function EditResourcePage() {
  const { id } = useParams<{ id: string }>();
  const canEdit = useCan("resources", "editar");
  const [initial, setInitial] = useState<Resource | null>(null);
  const [recordLoading, setRecordLoading] = useState(true), [formLoading, setFormLoading] = useState(true);
  useEffect(() => { if (!canEdit) return; void getResourceClient(id).then(setInitial).finally(() => setRecordLoading(false)); }, [canEdit, id]);
  if (!canEdit) return <AccessDenied403Page />;
  const loading = recordLoading || formLoading;
  return <>{loading ? <CatalogLoadingState label="formulario de recurso" fullPage /> : null}{initial ? <div className={loading ? "hidden" : undefined}><div className="grid min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full grid-rows-[auto_minmax(0,1fr)] gap-5 bg-[#F7FBF5] p-4 sm:p-6 lg:h-[calc(100dvh-var(--topbar-h)-48px)] lg:overflow-hidden lg:p-8"><AdminFormHeader icon={Boxes} title="Editar recurso físico" description="Actualizá la identificación, capacidad o disponibilidad del recurso." className="mb-0" /><div className="min-h-0 overflow-y-auto pr-2"><ResourceForm mode="edit" defaultValues={initial} onLoadingChange={setFormLoading} /></div></div></div> : null}</>;
}
