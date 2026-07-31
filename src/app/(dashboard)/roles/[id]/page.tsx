"use client";

import { RoleEditorPage } from "@/features/roles/components/management/RoleEditorPage";
import { useCan } from "@/hooks/useCan";
import AccessDenied403Page from "../../403/page";

export default function EditRolePage() {
  const canEdit = useCan("roles", "editar");
  return canEdit ? <RoleEditorPage mode="edit" /> : <AccessDenied403Page />;
}
