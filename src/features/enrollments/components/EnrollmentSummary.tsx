"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { listActivitySchedulesClient } from "@/features/activity-schedules/services/activity-schedules.service";
import { useCan } from "@/hooks/useCan";
import { enrollmentStatusLabel } from "../helpers/enrollment-display";
import { listEnrollmentsClient } from "../services/enrollments.service";
import type { Enrollment } from "../types/enrollment.types";

type Props = {
  activityScheduleId?: string;
  activityId?: string;
  userId?: string;
  compact?: boolean;
  embedded?: boolean;
  onLoadingChange?: (loading: boolean) => void;
};

export function EnrollmentSummary({ activityScheduleId, activityId, userId, compact = false, embedded = false, onLoadingChange }: Props) {
  const canView = useCan("enrollments", "ver");
  const canCreate = useCan("enrollments", "crear");
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [scheduleCount, setScheduleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const query = activityScheduleId ? `activityScheduleId=${activityScheduleId}` : activityId ? `activityId=${activityId}` : `userId=${userId}`;

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(false);
    try {
      const [enrollments, schedules] = await Promise.all([
        listEnrollmentsClient({ activityScheduleId, activityId, userId, page: 1, pageSize: 100 }),
        activityId ? listActivitySchedulesClient({ activityId }) : Promise.resolve([]),
      ]);
      setRows(enrollments.data);
      setScheduleCount(schedules.length);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [activityScheduleId, activityId, userId, canView]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => onLoadingChange?.(canView && loading), [canView, loading, onLoadingChange]);

  const totals = useMemo(() => ({
    confirmed: rows.filter((item) => item.status === "CONFIRMADA").length,
    waitlist: rows.filter((item) => item.status === "LISTA_ESPERA").length,
    pending: rows.filter((item) => item.status === "PENDIENTE").length,
    availableSchedules: new Set(rows.filter((item) => item.capacity.availableCount > 0).map((item) => item.activitySchedule.id)).size,
  }), [rows]);

  if (!canView) return null;
  if (loading) return <div className={embedded ? "" : "mt-5"}><CatalogLoadingState label="resumen de inscripciones" /></div>;

  return (
    <section className={embedded ? "" : "mt-5 border-t border-[var(--brand-border)] pt-5"}>
      <div className={`flex flex-wrap items-center gap-2 ${embedded ? "justify-end" : "justify-between"}`}>
        {!embedded ? <h3 className="flex items-center gap-2 font-extrabold text-[var(--brand-primary)]"><CalendarCheck className="size-5" />Inscripciones</h3> : null}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href={`/enrollments?${query}`}>{userId ? "Ver todas" : "Ver inscripciones"}</Link></Button>
          {canCreate ? <Button asChild size="sm" className="bg-[var(--brand-primary)]"><Link href={`/enrollments/new?${query}`}><Plus />Nueva inscripción</Link></Button> : null}
        </div>
      </div>
      {error ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"><span>No pudimos cargar el resumen.</span><Button variant="ghost" size="sm" onClick={() => void load()}>Reintentar</Button></div>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--brand-muted)]">Todavía no hay inscripciones registradas.</p>
      ) : (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Metric label="Confirmadas" value={totals.confirmed} />
            <Metric label="Lista de espera" value={totals.waitlist} />
            {activityScheduleId ? <><Metric label="Pendientes" value={totals.pending} /><Metric label="Disponibles" value={rows[0].capacity.availableCount} /></> : null}
            {activityId ? <><Metric label="Horarios" value={scheduleCount} /><Metric label="Horarios disponibles" value={totals.availableSchedules} /></> : null}
          </div>
          <div className="mt-3 grid gap-2">
            {rows.slice(0, compact ? 3 : 4).map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--brand-border-soft)] bg-white/70 p-3 text-sm">
                <p className="font-bold text-[var(--brand-ink)]">{userId ? item.activitySchedule.activity.name : [item.user.firstName, item.user.lastName].filter(Boolean).join(" ")}</p>
                <p className="text-[var(--brand-muted)]">{item.activitySchedule.day} · {item.activitySchedule.startTime} a {item.activitySchedule.endTime} · {item.activitySchedule.establishment.name}</p>
                <p className="font-medium text-[var(--brand-primary)]">{enrollmentStatusLabel(item.status)}{item.waitlistPosition ? ` · Posición ${item.waitlistPosition}` : ""}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[var(--brand-border-soft)] bg-white/70 px-3 py-2"><p className="text-xl font-extrabold text-[var(--brand-primary)]">{value}</p><p className="text-xs font-medium text-[var(--brand-muted)]">{label}</p></div>;
}
