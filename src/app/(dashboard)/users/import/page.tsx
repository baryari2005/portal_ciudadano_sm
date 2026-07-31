"use client";

import ImportUsersView from "@/features/import-users/components/ImportUsersView";
import { useCan } from "@/hooks/useCan";
import AccessDenied403Page from "../../403/page";

export default function Page() {
  const canImport = useCan("usuarios", "importar");

  if (!canImport) {
    return <AccessDenied403Page />;
  }

  return <ImportUsersView />;
}
