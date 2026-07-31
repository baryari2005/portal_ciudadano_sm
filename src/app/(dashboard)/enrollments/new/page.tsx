"use client";

import { useState } from "react";
import { AdminFormPage } from "@/components/layout/admin-form-page";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { EnrollmentForm } from "@/features/enrollments/components/EnrollmentForm";
import { useCan } from "@/hooks/useCan";
import AccessDenied403Page from "../../403/page";
import { ClipboardCheck } from "lucide-react";

export default function Page() {
  const [loading, setLoading] = useState(true);
  const canCreate = useCan("enrollments", "crear");
  const canAssign = useCan("enrollments", "asignar");
  if (!canCreate || !canAssign) return <AccessDenied403Page />;
  return <>{loading ? <CatalogLoadingState label="formulario de inscripción administrativa" fullPage /> : null}<div className={loading ? "hidden" : undefined}><AdminFormPage icon={ClipboardCheck} title="Inscripción administrativa" description="Inscribí a un ciudadano aplicando las mismas validaciones de edad, documentación y cupo del portal." fullWidth><EnrollmentForm onLoadingChange={setLoading} /></AdminFormPage></div></>;
}
