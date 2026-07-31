"use client";
import Link from "next/link";
import { Building2 } from "lucide-react";
import type { ReactNode } from "react";
import { AdminFormLoading, AdminFormPage } from "@/components/layout/admin-form-page";
import { useAccessEstablishment } from "../hooks/useAccessEstablishment";
export function AccessShell({ title, description, children }: { title: string; description: string; children: (state: ReturnType<typeof useAccessEstablishment>) => ReactNode }) {
  const state = useAccessEstablishment();
  return <AdminFormPage title={title} description={description} fullWidth breadcrumbs={[{ label: "Control de ingreso", href: "/access" }, { label: title }]}>
    {state.loading ? <AdminFormLoading label="Cargando establecimientos..." /> : <><div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#819B56]/25 bg-white p-4"><Building2 className="size-5 text-[#1D4F36]"/><label className="font-semibold text-[#1D4F36]" htmlFor="access-establishment">Seleccionar establecimiento</label><select id="access-establishment" className="h-10 min-w-64 rounded-xl border border-[#819B56]/35 bg-[#F7FBF5] px-3 text-sm text-[#1D4F36] outline-none focus:ring-2 focus:ring-[#819B56]" value={state.establishmentId} onChange={(event) => state.setEstablishmentId(event.target.value)}><option value="">Seleccioná una opción</option>{state.options.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select><nav className="ml-auto flex gap-3 text-sm font-semibold text-[#1D4F36]"><Link href="/access/scan">Escanear QR</Link><Link href="/access/manual">Búsqueda manual</Link><Link href="/access/history">Historial</Link></nav></div>{children(state)}</>}
  </AdminFormPage>;
}
