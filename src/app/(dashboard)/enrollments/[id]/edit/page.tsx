"use client";

import { use } from "react";

import AccessDenied403Page from "../../../403/page";
import { CitizenEnrollmentSchedulePage } from "@/features/citizen/components/CitizenEnrollmentSchedulePage";
import { useCan } from "@/hooks/useCan";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const canEdit = useCan("enrollments", "editar");
  if (!canEdit) return <AccessDenied403Page />;
  return <CitizenEnrollmentSchedulePage enrollmentId={id} mode="admin" returnHref="/enrollments" />;
}
