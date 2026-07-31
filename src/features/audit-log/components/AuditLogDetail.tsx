import Link from "next/link";
import { Clock, Database, Eye, Globe2, History, UserRound } from "lucide-react";
import { AdminDetailHeader } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { CatalogDetailField, formatCatalogDate } from "@/features/activity-catalogs/components/CatalogPrimitives";
import type { AuditLog } from "../types/audit-log.types";

const labels: Record<string, string> = { CREAR: "Creación", EDITAR: "Edición", DESACTIVAR: "Desactivación", REACTIVAR: "Reactivación", CANCELAR: "Cancelación", SUSPENDER: "Suspensión", FINALIZAR: "Finalización", APROBAR: "Aprobación", RECHAZAR: "Rechazo", ASIGNAR: "Asignación", DESASIGNAR: "Desasignación", CERRAR: "Cierre", REABRIR: "Reapertura", EMITIR: "Emisión", REVOCAR: "Revocación", INSCRIBIR: "Inscripción", PROMOVER: "Promoción", MARCAR_PRESENTE: "Presente", MARCAR_AUSENTE: "Ausente", JUSTIFICAR: "Justificación", ELIMINAR: "Eliminación" };
const value = (input: unknown) => input == null || input === "" ? "Sin definir" : Array.isArray(input) ? input.join(", ") : typeof input === "object" ? JSON.stringify(input) : String(input);

function currentRecordRoute(entry: AuditLog) {
  if (!entry.entityId || entry.action === "ELIMINAR") return null;
  switch (entry.entityType) {
    case "ACTIVIDAD": return `/activities/${entry.entityId}/record/overview`;
    case "ESTABLECIMIENTO": return `/facilities/${entry.entityId}/record/overview`;
    case "HORARIO_ACTIVIDAD": return `/activity-schedules/${entry.entityId}/record/overview`;
    case "USUARIO": return `/users/${entry.entityId}/record/overview`;
    case "ROL": return `/roles/${entry.entityId}/record/overview`;
    case "PERMISO": return `/roles/${entry.entityId}/record/permissions`;
    case "CREDENCIAL_QR": return `/users/${entry.entityId}/record/access`;
    case "ASISTENCIA": {
      const sessionId = typeof entry.metadata?.sessionId === "string" ? entry.metadata.sessionId : null;
      return sessionId ? `/attendance/${sessionId}` : null;
    }
    default: return null;
  }
}

export function AuditLogDetail({ entry }: { entry: AuditLog }) {
  const changes = Object.entries(entry.changes ?? {});
  const route = currentRecordRoute(entry);
  return <>
    <AdminDetailHeader title={entry.entityName || entry.entityType.replaceAll("_", " ")} subtitle={`${labels[entry.action] ?? entry.action} · ${formatCatalogDate(entry.createdAt)}`} leading={<span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white shadow-sm"><History className="size-8" /></span>} action={route ? <Button asChild variant="outline" className="w-full border-[var(--brand-secondary)] bg-white font-bold text-[var(--brand-primary)]"><Link href={route}><Eye />Ir al registro actual</Link></Button> : undefined} />
    <dl className="mt-6 grid gap-3">
      <CatalogDetailField icon={UserRound} label="Actor">{entry.actorName || "Sistema"}{entry.actorEmail ? <span className="block text-xs font-normal">{entry.actorEmail}</span> : null}</CatalogDetailField>
      <CatalogDetailField icon={Database} label="Entidad">{entry.entityType.replaceAll("_", " ")}</CatalogDetailField>
      <CatalogDetailField icon={Clock} label="Fecha y hora">{formatCatalogDate(entry.createdAt)}</CatalogDetailField>
      <CatalogDetailField icon={Globe2} label="Origen">{entry.origin.replaceAll("_", " ")}</CatalogDetailField>
    </dl>
    <section className="mt-6 border-t border-[var(--brand-border)] pt-5"><h3 className="font-extrabold text-[var(--brand-primary)]">Cambios realizados</h3>{changes.length ? <div className="mt-3 overflow-x-auto rounded-2xl border border-[var(--brand-border-soft)] bg-white"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-[var(--brand-control)] text-[var(--brand-text)]"><tr><th className="p-3">Campo</th><th className="p-3">Valor anterior</th><th className="p-3">Valor nuevo</th></tr></thead><tbody>{changes.map(([field, change]) => <tr key={field} className="border-t border-[var(--brand-border-soft)]"><td className="p-3 font-bold">{field}</td><td className="p-3">{value(change.before)}</td><td className="p-3">{value(change.after)}</td></tr>)}</tbody></table></div> : <p className="mt-2 text-sm text-[var(--brand-muted)]">La operación no registró cambios de campos.</p>}</section>
    {entry.metadata && Object.keys(entry.metadata).length ? <section className="mt-5 rounded-2xl border border-[var(--brand-border-soft)] bg-white/70 p-4"><h3 className="font-bold text-[var(--brand-primary)]">Contexto</h3><dl className="mt-2 grid gap-2 text-sm">{Object.entries(entry.metadata).map(([key, item]) => <div key={key} className="grid grid-cols-[minmax(100px,140px)_1fr] gap-2"><dt className="font-bold">{key}</dt><dd className="break-words">{value(item)}</dd></div>)}</dl></section> : null}
    <p className="mt-5 text-xs text-[var(--brand-muted)]">Datos técnicos: {entry.ipHash ? "IP anonimizada registrada" : "IP no disponible"}{entry.userAgent ? ` · ${entry.userAgent}` : ""}</p>
  </>;
}
