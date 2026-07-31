"use client";

import { useCan } from "@/hooks/useCan";
import AccessDenied403Page from "../../403/page";
import { ExportUsersView } from "@/features/users/export/components/ExportUsersView";

export default function ExportUsersPage() {
  const canExport = useCan("usuarios", "exportar");

  if (!canExport) {
    return <AccessDenied403Page />;
  }

  return <ExportUsersView />;
}
