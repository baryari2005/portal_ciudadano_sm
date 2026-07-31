"use client";

import { useCan } from "@/hooks/useCan";
import AccessDenied403Page from "../403/page";
import { UsersManagementPage } from "@/features/users/components/management/UsersManagementPage";

export default function UsersPage() {
  const canView = useCan("usuarios", "ver");

  if (!canView) {
    return <AccessDenied403Page />;
  }

  return <UsersManagementPage />;
}
