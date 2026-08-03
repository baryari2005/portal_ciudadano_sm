"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { listAccessHistory } from "../services/access.service";
import { AccessShell } from "./AccessShell";

type Row = { id: string; fechaHora: string; nombreSnapshot: string | null; documentoSnapshot: string | null; resultado: string; motivo: string; origen: string; anuladoAt: string | null };
const origins: Record<string, string> = { QR: "QR anterior", QR_DIGITAL: "QR digital", CARNET_FISICO: "Carnet físico", MANUAL: "Manual" };

export function AccessHistoryPage() {
  return <AccessShell title="Historial de accesos" description="Consultá intentos permitidos, rechazados y anulados.">{({ establishmentId }) => <History establishmentId={establishmentId} />}</AccessShell>;
}

function History({ establishmentId }: { establishmentId: string }) {
  const [search, setSearch] = useState("");
  const [result, setResult] = useState("");
  const [origin, setOrigin] = useState("");
  const [items, setItems] = useState<Row[]>([]);
  useEffect(() => {
    if (!establishmentId) { setItems([]); return; }
    void listAccessHistory({ establishmentId, search: search || undefined, result: result || undefined, origin: origin || undefined, page: 1, pageSize: 20 }).then((data) => setItems(data.items));
  }, [establishmentId, search, result, origin]);
  if (!establishmentId) return <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-[#819B56]/40 bg-white text-[#315644]">Seleccioná un establecimiento.</div>;
  return <div className="grid gap-4">
    <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px]"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar persona o DNI..."/><select value={result} onChange={(event) => setResult(event.target.value)} className="rounded-xl border border-[#819B56]/35 bg-white px-3"><option value="">Todos los resultados</option><option value="PERMITIDO">Permitidos</option><option value="RECHAZADO">Rechazados</option></select><select value={origin} onChange={(event) => setOrigin(event.target.value)} className="rounded-xl border border-[#819B56]/35 bg-white px-3"><option value="">Todos los orígenes</option><option value="QR_DIGITAL">QR digital</option><option value="CARNET_FISICO">Carnet físico</option><option value="MANUAL">Manual</option><option value="QR">QR anterior</option></select></div>
    <section className="overflow-hidden rounded-3xl border border-[#819B56]/25 bg-white"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#EEF6E9] text-[#1D4F36]"><tr><th className="p-4">Fecha y hora</th><th className="p-4">Persona</th><th className="p-4">Resultado</th><th className="p-4">Motivo</th><th className="p-4">Origen</th><th className="p-4">Estado</th></tr></thead><tbody>{items.map((row) => <tr key={row.id} className="border-t border-[#819B56]/15"><td className="p-4"><Link className="font-semibold text-[#1D4F36] hover:underline" href={`/reception/${row.id}`}>{new Date(row.fechaHora).toLocaleString("es-AR")}</Link></td><td className="p-4">{row.nombreSnapshot ?? "No identificado"}<small className="block text-[#315644]">{row.documentoSnapshot}</small></td><td className="p-4">{row.resultado === "PERMITIDO" ? "Permitido" : "Rechazado"}</td><td className="p-4">{row.motivo.replaceAll("_", " ").toLowerCase()}</td><td className="p-4">{origins[row.origen] ?? row.origen}</td><td className="p-4">{row.anuladoAt ? "Anulado" : "Vigente"}</td></tr>)}</tbody></table>{!items.length ? <div className="grid min-h-40 place-items-center text-[#315644]">No hay accesos para mostrar.</div> : null}</div></section>
  </div>;
}
