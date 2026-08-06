"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useCan } from "@/hooks/useCan";
import { formatSessionDate } from "../helpers/activity-session-display";
import { listActivitySessionsClient } from "../services/activity-sessions.service";
import type { ActivitySession } from "../types/activity-session.types";

export function ActivitySessionSummary({ activityScheduleId, activityId, embedded = false, onLoadingChange }: { activityScheduleId?: string; activityId?: string; embedded?: boolean; onLoadingChange?: (loading: boolean) => void }) {
  const canView = useCan("activity_sessions", "ver");
  const canCreate = useCan("activity_sessions", "crear");
  const [rows, setRows] = useState<ActivitySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const query = activityScheduleId ? `activityScheduleId=${activityScheduleId}` : `activityId=${activityId}`;
  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true); setError(false);
    try {
      const today = new Date();
      const dateFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const result = await listActivitySessionsClient({ activityScheduleId, activityId, dateFrom, page: 1, pageSize: 3 });
      setRows(result.data);
    } catch { setError(true); } finally { setLoading(false); }
  }, [activityScheduleId, activityId, canView]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => onLoadingChange?.(canView && loading), [canView, loading, onLoadingChange]);
  if (!canView) return null;
  if (loading) return <div className={embedded ? "" : "mt-5"}><CatalogLoadingState label="próximas clases" /></div>;
  return <section className={embedded ? "" : "mt-5 border-t border-[var(--brand-border)] pt-5"}>
    <div className={`flex flex-wrap items-center gap-2 ${embedded ? "justify-end" : "justify-between"}`}>
      {!embedded ? <h3 className="flex items-center gap-2 font-extrabold text-[var(--brand-primary)]"><CalendarDays className="size-5" />Próximas clases</h3> : null}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm"><Link href={`/activity-sessions?${query}`}>{activityId ? "Ver calendario de clases" : "Ver todas las clases"}</Link></Button>
        {canCreate && activityScheduleId ? <Button asChild size="sm" className="bg-[var(--brand-primary)]"><Link href={`/activity-sessions/new?activityScheduleId=${activityScheduleId}`}><Plus />Generar clases</Link></Button> : null}
      </div>
    </div>
    {error ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">No pudimos cargar las clases. <Button variant="ghost" size="sm" onClick={() => void load()}>Reintentar</Button></div>
      : rows.length === 0 ? <p className="mt-3 text-sm text-[var(--brand-muted)]">Todavía no hay próximas clases programadas.</p>
      : <div className="mt-3 grid gap-2">{rows.map((item) => <div key={item.id} className="rounded-xl border border-[var(--brand-border-soft)] bg-white/70 p-3 text-sm"><p className="font-bold text-[var(--brand-ink)]">{formatSessionDate(item.date)} · {item.startTime}</p><p className="text-[var(--brand-muted)]">{item.activitySchedule.activity.name} · {item.establishment.name}</p></div>)}</div>}
  </section>;
}
