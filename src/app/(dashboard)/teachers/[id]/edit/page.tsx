"use client";

import { useParams } from "next/navigation";
import AccessDenied403Page from "../../../403/page";
import { ProfesorFormPage } from "@/features/profesores/components/ProfesorFormPage";
import { useCan } from "@/hooks/useCan";

export default function EditTeacherPage() {
  const { id } = useParams<{ id: string }>();
  return useCan("profesores", "editar") ? <ProfesorFormPage id={id} /> : <AccessDenied403Page />;
}
