"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CircleAlert, Inbox, RefreshCw, UserRound, type LucideIcon } from "lucide-react";

import { AdminPageShell, adminSecondaryButtonClass } from "@/components/shared/admin-patterns";
import { AdminFormHeader } from "@/components/layout/admin-form-page";
import { Button } from "@/components/ui/button";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { cn } from "@/lib/utils";
import { citizenGet } from "../services/citizen.service";

export function CitizenPageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <AdminPageShell className={className}>{children}</AdminPageShell>;
}

export function CitizenHeader({ title, description, icon = UserRound, action }: { title: string; description: string; icon?: LucideIcon; action?: ReactNode }) {
  return <AdminFormHeader title={title} description={description} icon={icon} action={action} />;
}

export function CitizenCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-3xl border border-[var(--brand-border-soft)] bg-white p-5 text-[var(--brand-ink)] shadow-sm sm:p-6", className)}>{children}</section>;
}

export function useCitizenData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(false); try { setData(await citizenGet<T>(path)); } catch { setError(true); } finally { setLoading(false); } }, [path]);
  useEffect(() => { void load(); }, [load]);
  return { data, setData, loading, error, retry: load };
}

export function CitizenState({ loading, error, onRetry, empty, children, loadingLabel = "información" }: { loading: boolean; error: boolean; onRetry: () => void; empty?: boolean; children: ReactNode; loadingLabel?: string }) {
  if (loading) return <CatalogLoadingState label={loadingLabel} fullPage />;
  if (error) return <CitizenCard className="mt-6 grid min-h-64 place-items-center text-center"><div><CircleAlert className="mx-auto size-10 text-red-700" /><p className="mt-4 font-extrabold text-[var(--brand-primary)]">No pudimos cargar la información.</p><Button variant="outline" className={cn(adminSecondaryButtonClass, "mt-5")} onClick={onRetry}><RefreshCw />Reintentar</Button></div></CitizenCard>;
  if (empty) return <CitizenCard className="mt-6 grid min-h-64 place-items-center text-center"><div><Inbox className="mx-auto size-10 text-[var(--brand-secondary)]" /><p className="mt-4 font-extrabold text-[var(--brand-primary)]">Todavía no hay información para mostrar.</p></div></CitizenCard>;
  return <>{children}</>;
}
