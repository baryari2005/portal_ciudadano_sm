"use client";

import { KeyRound, ShieldCheck } from "lucide-react";

import { AdminRecordLayout } from "@/components/shared/admin-record-layout";

export function RoleScreenLoading({ mode }: { mode: "create" | "edit" | "record" }) {
  const record = mode === "record";
  return (
    <AdminRecordLayout
      title={record ? "Ficha completa del rol" : mode === "create" ? "Nuevo rol" : "Editar rol"}
      description={record ? "Información integral del rol y sus permisos." : "Cargando datos y permisos del rol."}
      icon={ShieldCheck}
      backHref="/roles"
      sections={[{ id: record ? "overview" : "general", label: record ? "Resumen" : "Datos generales", icon: record ? ShieldCheck : KeyRound }]}
      activeSection={record ? "overview" : "general"}
      onSectionChange={() => undefined}
      navigationDisabled
      loading
      loadingLabel={record ? "información del rol" : "rol y permisos"}
      contentClassName={record ? undefined : "bg-white/80"}
    >
      {null}
    </AdminRecordLayout>
  );
}
