"use client";

import { useCan } from "@/hooks/useCan";
import { RolesManagementPage } from "@/features/roles/components/management/RolesManagementPage";
import AccessDenied403Page from "../403/page";

export default function RolesPage() {
  const canView = useCan("roles", "ver");

  if (!canView) {
    return <AccessDenied403Page />;
  }

  return <RolesManagementPage />;
}
