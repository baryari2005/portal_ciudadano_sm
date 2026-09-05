"use client";

import { useState } from "react";
import { ClipboardCheck } from "lucide-react";
import AccessDenied403Page from "@/app/(dashboard)/403/page";
import { AdminFormPage } from "@/components/layout/admin-form-page";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { EnrollmentForm } from "@/features/enrollments/components/EnrollmentForm";
import { useCan } from "@/hooks/useCan";
import { ReceptionMobileHeader } from "@/features/reception/components/mobile/ReceptionMobileHeader";

export default function ReceptionNewEnrollmentPage() {
  const [loading, setLoading] = useState(true);
  const canCreate = useCan("enrollments", "crear");
  const canAssign = useCan("enrollments", "asignar");
  const allowed = canCreate && canAssign;
  if (!allowed) return <AccessDenied403Page />;
  return <>
    {loading ? <CatalogLoadingState label="formulario de inscripción" fullPage /> : null}
    <div className={loading ? "hidden" : undefined}>
      <ReceptionMobileHeader />
      <AdminFormPage icon={ClipboardCheck} title="Nueva inscripción" description="Inscribí a un ciudadano aplicando las validaciones de edad, documentación y cupo." fullWidth mobileReception>
        <EnrollmentForm onLoadingChange={setLoading} backHref="/reception/enrollments" mobileReception />
      </AdminFormPage>
    </div>
  </>;
}
