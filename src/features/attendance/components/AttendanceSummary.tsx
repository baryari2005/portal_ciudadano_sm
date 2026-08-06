"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AttendanceQrAction } from "@/features/attendance-qr/components/AttendanceQrAction";
import { TEACHER_SESSION_ACCESS_DENIED_MESSAGE } from "@/features/teacher/constants/teacher-errors";
import { useCan } from "@/hooks/useCan";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";
import { getAttendanceRosterClient } from "../services/attendance.service";
import type { AttendanceRoster } from "../types/attendance.types";

export function AttendanceSummary({ sessionId }: { sessionId: string }) {
  const canView = useCan("attendance", "ver");
  const [data, setData] = useState<AttendanceRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"assignment" | "technical" | null>(null);
  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getAttendanceRosterClient(sessionId));
    } catch (requestError: unknown) {
      setError(
        getAxiosMessage(requestError, "") === TEACHER_SESSION_ACCESS_DENIED_MESSAGE
          ? "assignment"
          : "technical",
      );
    } finally {
      setLoading(false);
    }
  }, [canView, sessionId]);

  useEffect(() => { void load(); }, [load]);

  if (!canView) return null;

  return (
    <section className="mt-5 border-t border-[var(--brand-border)] pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-[var(--brand-primary)]">Asistencia</h3>
          {loading ? (
            <div className="mt-2 h-12 w-72 animate-pulse rounded-xl bg-white/70" />
          ) : error === "technical" ? (
            <p className="mt-2 text-sm text-amber-800">
              No pudimos cargar el resumen. <Button variant="ghost" size="sm" onClick={() => void load()}>Reintentar</Button>
            </p>
          ) : error === "assignment" ? (
            <p className="mt-2 text-sm text-[var(--brand-muted)]">El resumen estará disponible al abrir la planilla.</p>
          ) : data ? (
            <>
              <p className="mt-1 text-sm font-bold text-[var(--brand-primary)]">
                {data.session.status === "CANCELADA" ? "La clase está cancelada y no admite asistencia." : data.session.attendanceState === "CLOSED" ? "Asistencia cerrada" : "Asistencia abierta"}
              </p>
              <p className="text-sm text-[var(--brand-muted)]">
                {data.summary.eligibleCount} habilitadas · {data.summary.presentCount} presentes · {data.summary.absentCount} ausentes · {data.summary.justifiedCount} justificadas · {data.summary.unregisteredCount} sin registrar
              </p>
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" className="bg-[var(--brand-primary)]">
            <Link href={`/attendance/${sessionId}`} prefetch={false}>Ver planilla</Link>
          </Button>
          <AttendanceQrAction sessionId={sessionId} compact />
        </div>
      </div>
    </section>
  );
}
