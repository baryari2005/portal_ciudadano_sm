"use client";

import AccessDenied403Page from "../../403/page";
import { ProfesorFormPage } from "@/features/profesores/components/ProfesorFormPage";
import { useCan } from "@/hooks/useCan";

export default function NewTeacherPage() {
  return useCan("profesores", "crear") ? <ProfesorFormPage /> : <AccessDenied403Page />;
}
