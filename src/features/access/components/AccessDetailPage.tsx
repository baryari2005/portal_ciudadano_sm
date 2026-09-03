"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { annulAccess, getAccessDetail } from "../services/access.service";
import { AccessShell } from "./AccessShell";

type AccessDetail = { resultado: string; motivo: string; nombreSnapshot: string | null; documentoSnapshot: string | null; fechaHora: string; origen: string; observaciones: string | null; anuladoAt: string | null; motivoAnulacion: string | null; establecimiento: { nombre: string }; registradoPor: { nombre: string | null; apellido: string | null } | null; claseActividad: { id: string; horarioActividad: { actividad: { nombre: string } } } | null; inscripcion: { estado: string } | null };

export function AccessDetailPage({ id }: { id: string }) {
  const [record, setRecord] = useState<AccessDetail | null>(null);
  const [reason, setReason] = useState("");
  useEffect(() => { void getAccessDetail(id).then(setRecord); }, [id]);
  async function annul() { if (reason.trim().length < 5) return; await annulAccess(id, reason); setRecord(await getAccessDetail(id)); }
  return <AccessShell title="Detalle de acceso" description="Información del registro y su trazabilidad.">{() => !record ? <div className="h-72 animate-pulse rounded-3xl bg-[#EEF6E9]"/> : <div className="grid gap-6"><section className="grid gap-4 rounded-3xl border border-[#819B56]/25 bg-white p-6 sm:grid-cols-2"><Field label="Resultado" value={record.resultado}/><Field label="Motivo" value={record.motivo}/><Field label="Persona" value={record.nombreSnapshot ?? "No identificada"}/><Field label="DNI" value={record.documentoSnapshot ?? "No informado"}/><Field label="Establecimiento" value={record.establecimiento.nombre}/><Field label="Fecha y hora" value={new Date(record.fechaHora).toLocaleString("es-AR")}/><Field label="Origen" value={record.origen}/><Field label="Operador" value={record.registradoPor ? [record.registradoPor.nombre, record.registradoPor.apellido].filter(Boolean).join(" ") : "No informado"}/><Field label="Clase" value={record.claseActividad?.horarioActividad?.actividad?.nombre ?? "Sin clase relacionada"}/><Field label="Inscripción" value={record.inscripcion?.estado ?? "Sin inscripción relacionada"}/><Field label="Observaciones" value={record.observaciones ?? "Sin observaciones"}/><Field label="Estado" value={record.anuladoAt ? `Anulado: ${record.motivoAnulacion}` : "Vigente"}/>{record.claseActividad ? <Link className="font-semibold text-[#1D4F36] underline" href={`/attendance/${record.claseActividad.id}`}>Ir a la asistencia</Link> : null}</section>{!record.anuladoAt ? <section className="rounded-3xl border border-red-200 bg-white p-6"><h2 className="font-bold text-red-800">Anular registro</h2><p className="mt-1 text-sm text-[#315644]">La anulación no modifica inscripciones ni asistencias.</p><Textarea className="mt-4" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo obligatorio"/><Button className="mt-3" variant="destructive" disabled={reason.trim().length < 5} onClick={() => void annul()}>Anular registro</Button></section> : null}</div>}</AccessShell>;
}
function Field({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-bold uppercase tracking-wide text-[#819B56]">{label}</p><p className="mt-1 text-sm font-semibold text-[#1D4F36]">{value}</p></div>; }
