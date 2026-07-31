"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogDetailField } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useCan } from "@/hooks/useCan";
import { listActivitySchedulesClient } from "../services/activity-schedules.service";
import { dayLabel } from "../helpers/activity-schedule-display";
import type { ActivitySchedule } from "../types/activity-schedule.types";

type Props = { activityId?: string; establishmentId?: string; title?: string; onLoadingChange?: (loading: boolean) => void; showActions?: boolean; contentOnly?: boolean };

export function ActivityScheduleSummary({ activityId, establishmentId, title = "Horarios", onLoadingChange, showActions: requestedActions = true, contentOnly: requestedContentOnly }: Props) {
  const [rows, setRows] = useState<ActivitySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const canView = useCan("activity_schedules", "ver");
  const canCreate = useCan("activity_schedules", "crear");
  const contentOnly = requestedContentOnly ?? Boolean(establishmentId);
  const showActions = requestedActions && Boolean(activityId) && !contentOnly;

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    listActivitySchedulesClient({ activityId, establishmentId }).then(setRows).finally(() => setLoading(false));
  }, [activityId, establishmentId, canView]);
  useEffect(() => onLoadingChange?.(canView && loading), [canView, loading, onLoadingChange]);

  if (!canView) return null;
  const query = activityId ? `activityId=${activityId}` : `establishmentId=${establishmentId}`;
  return <section className={contentOnly ? "mt-5" : "mt-5 border-t border-[var(--brand-border)] pt-5"}>
    {!contentOnly ? <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-extrabold text-[var(--brand-primary)]"><CalendarClock className="size-5" />{title}</h3>{showActions ? <div className="flex gap-2"><Button asChild variant="outline" size="sm"><Link href={`/activity-schedules?${query}`}>Ver todos</Link></Button>{canCreate ? <Button asChild size="sm" className="bg-[var(--brand-primary)]"><Link href={`/activity-schedules/new?${query}`}><Plus />Agregar horario</Link></Button> : null}</div> : null}</div> : null}
    <div className="grid gap-3 text-sm">{loading ? <p>Cargando horarios...</p> : rows.length ? rows.slice(0, 4).map((row) => <CatalogDetailField key={row.id} icon={CalendarClock} label={`${dayLabel(row.day)} · ${row.startTime} a ${row.endTime}`}><span>{activityId ? row.establishment.name : row.activity.name} · {row.professors.map((person) => person.fullName).join(", ") || "Sin profesores"}</span></CatalogDetailField>) : <p className="text-[var(--brand-muted)]">No hay horarios registrados.</p>}</div>
  </section>;
}
