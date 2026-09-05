"use client";

import { use, useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import AccessDenied403Page from "@/app/(dashboard)/403/page";
import { AdminFormError, AdminFormPage } from "@/components/layout/admin-form-page";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { EnrollmentForm } from "@/features/enrollments/components/EnrollmentForm";
import { getEnrollmentClient } from "@/features/enrollments/services/enrollments.service";
import type { Enrollment } from "@/features/enrollments/types/enrollment.types";
import { useCan } from "@/hooks/useCan";
import { ReceptionMobileHeader } from "@/features/reception/components/mobile/ReceptionMobileHeader";

export default function ReceptionEditEnrollmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const canEdit = useCan("enrollments", "editar");
  const load = () => {
    setLoading(true);
    setError(false);
    getEnrollmentClient(id).then(setItem).catch(() => setError(true)).finally(() => setLoading(false));
  };
  useEffect(load, [id]);
  if (!canEdit) return <AccessDenied403Page />;
  if (loading) return <CatalogLoadingState label="inscripción" fullPage />;
  if (error || !item) return <AdminFormPage icon={ClipboardCheck} title="Editar inscripción" description=""><AdminFormError message="No pudimos cargar la inscripción." backHref="/reception/enrollments" onRetry={load} /></AdminFormPage>;
  return <><ReceptionMobileHeader/><AdminFormPage icon={ClipboardCheck} title="Editar inscripción" description="Actualizá las observaciones y gestioná su estado desde el detalle." breadcrumbs={[{ label: "Inscripciones", href: "/reception/enrollments" }, { label: "Editar inscripción" }]} fullWidth mobileReception>
    <EnrollmentForm initialValues={item} backHref="/reception/enrollments" mobileReception />
  </AdminFormPage></>;
}
