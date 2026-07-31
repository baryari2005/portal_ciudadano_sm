"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { QrCode, Search, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAccessHome } from "../services/access.service";
import { AccessShell } from "./AccessShell";
export function AccessHomePage() { return <AccessShell title="Control de ingreso" description="Panel operativo de recepción para validar y registrar ingresos.">{({ establishmentId }) => <AccessHomeContent establishmentId={establishmentId}/>}</AccessShell>; }
type HomeData = { allowed: number; rejected: number; recent: Array<{ nombreSnapshot: string | null; resultado: string }>; upcoming: Array<{ horaInicio: string; horarioActividad: { actividad: { nombre: string } } }> };
function AccessHomeContent({ establishmentId }: { establishmentId: string }) {
  const [data, setData] = useState<HomeData | null>(null);
  useEffect(() => { if (!establishmentId) { setData(null); return; } void getAccessHome(establishmentId).then(setData); }, [establishmentId]);
  if (!establishmentId) return <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-[#819B56]/40 bg-white text-[#315644]">Seleccioná el establecimiento donde se realizará el control.</div>;
  if (!data) return <div className="h-64 animate-pulse rounded-3xl bg-[#EEF6E9]"/>;
  return <div className="grid gap-6"><div className="flex flex-wrap gap-3"><Button asChild><Link href="/access/scan"><QrCode/>Escanear QR</Link></Button><Button asChild variant="outline"><Link href="/access/manual"><Search/>Búsqueda manual</Link></Button><Button asChild variant="outline"><Link href="/access/history"><History/>Historial de accesos</Link></Button></div><div className="grid gap-4 sm:grid-cols-2"><Stat label="Accesos permitidos hoy" value={data.allowed}/><Stat label="Accesos rechazados hoy" value={data.rejected}/></div><div className="grid gap-6 lg:grid-cols-2"><SimpleList title="Últimos accesos" items={data.recent.map((item) => `${item.nombreSnapshot ?? "No identificado"} · ${item.resultado === "PERMITIDO" ? "Permitido" : "Rechazado"}`)}/><SimpleList title="Próximas clases" items={data.upcoming.map((item) => `${item.horarioActividad.actividad.nombre} · ${item.horaInicio}`)}/></div></div>;
}
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-3xl border border-[#819B56]/25 bg-white p-6"><p className="text-sm text-[#315644]">{label}</p><p className="mt-2 text-3xl font-bold text-[#1D4F36]">{value}</p></div>; }
function SimpleList({ title, items }: { title: string; items: string[] }) { return <section className="rounded-3xl border border-[#819B56]/25 bg-white p-6"><h2 className="font-bold text-[#1D4F36]">{title}</h2><div className="mt-4 grid gap-2 text-sm text-[#315644]">{items.length ? items.map((item, index) => <div key={`${item}-${index}`} className="rounded-xl bg-[#F7FBF5] p-3">{item}</div>) : <p>Sin registros para mostrar.</p>}</div></section>; }
