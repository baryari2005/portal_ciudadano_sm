"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/useCan";
import { axiosInstance } from "@/lib/axios";

type Item = { id: string; status: "PRESENTE" | "AUSENTE" | "JUSTIFICADA"; justificationReason: string | null; enrollmentStatus: string; session: { id: string; date: string; startTime: string; endTime: string; activity: { id: string; name: string }; establishment: { id: string; name: string } } };
const label = { PRESENTE: "Presente", AUSENTE: "Ausente", JUSTIFICADA: "Justificada" };

export function UserAttendanceHistory({ userId, onLoadingChange }: { userId: string; onLoadingChange?: (loading: boolean) => void }) {
  const canView = useCan("attendance", "ver");
  const [rows, setRows] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(false);
    try { setRows((await axiosInstance.get<{ data: Item[] }>(`/users/${userId}/attendance`)).data.data); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, [canView, userId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => onLoadingChange?.(canView && loading), [canView, loading, onLoadingChange]);
  if (!canView) return null;
  return <section className="mt-5 border-t border-[#C9D9C3] pt-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-extrabold text-[#1D4F36]"><CalendarCheck className="size-5" />Historial de asistencia</h3><Button asChild variant="outline" size="sm"><Link href={`/attendance?userId=${userId}`}>Ver asistencias</Link></Button></div>{loading ? <div className="mt-3 grid gap-2">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-white/70" />)}</div> : error ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">No pudimos cargar el historial. <Button variant="ghost" size="sm" onClick={() => void load()}>Reintentar</Button></div> : rows.length === 0 ? <p className="mt-3 text-sm text-[#5F6F68]">Todavía no hay registros de asistencia para este usuario.</p> : <div className="mt-3 grid gap-2">{rows.map((item) => <div key={item.id} className="rounded-xl border border-[#DDE8D7] bg-white/70 p-3 text-sm"><p className="font-bold text-[#173C2A]">{item.session.activity.name}</p><p className="text-[#5F6F68]">{new Date(`${item.session.date}T00:00:00`).toLocaleDateString("es-AR")} · {item.session.startTime} a {item.session.endTime} · {item.session.establishment.name}</p><p className="font-semibold text-[#1D4F36]">{label[item.status]}{item.enrollmentStatus !== "CONFIRMADA" ? ` · Inscripción ${item.enrollmentStatus}` : ""}</p>{item.justificationReason ? <p className="text-xs text-[#5F6F68]">{item.justificationReason}</p> : null}</div>)}</div>}</section>;
}
