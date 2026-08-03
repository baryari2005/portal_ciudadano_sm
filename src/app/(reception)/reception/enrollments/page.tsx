"use client";

import AccessDenied403Page from "@/app/(dashboard)/403/page";
import { EnrollmentsPage } from "@/features/enrollments/components/EnrollmentsPage";
import { useCan } from "@/hooks/useCan";

export default function ReceptionEnrollmentsPage() {
  return useCan("enrollments", "ver")
    ? <EnrollmentsPage basePath="/reception/enrollments" />
    : <AccessDenied403Page />;
}
