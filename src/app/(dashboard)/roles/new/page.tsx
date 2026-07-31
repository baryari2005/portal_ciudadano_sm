"use client";

import { RoleEditorPage } from "@/features/roles/components/management/RoleEditorPage";
import { useCan } from "@/hooks/useCan";
import AccessDenied403Page from "../../403/page";

export default function NewRolePage() {
  const canCreate = useCan("roles", "crear");
  return canCreate ? <RoleEditorPage mode="create" /> : <AccessDenied403Page />;
}
