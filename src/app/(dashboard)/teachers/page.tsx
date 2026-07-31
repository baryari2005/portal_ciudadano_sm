"use client";

import AccessDenied403Page from "../403/page";
import { ProfesoresPage } from "@/features/profesores/components/ProfesoresPage";
import { useCan } from "@/hooks/useCan";

export default function TeachersRoutePage() {
  return useCan("profesores", "ver") ? <ProfesoresPage /> : <AccessDenied403Page />;
}
