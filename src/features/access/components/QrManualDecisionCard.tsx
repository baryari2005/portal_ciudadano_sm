"use client";

import { Info } from "lucide-react";
import { AccessPersonCard } from "./AccessPersonCard";
import { ManualAccessDecisionControls } from "./ManualAccessDecisionControls";
import type { AccessPendingResponse } from "../types/access.types";

export function QrManualDecisionCard({ result, observation, loading, error, onObservation, onRegister, mobile = false }: {
  result: AccessPendingResponse; observation: string; loading: boolean; error: string;
  onObservation: (value: string) => void; onRegister: (decision: "ALLOW" | "REJECT") => Promise<void>; mobile?: boolean;
}) {
  return <section data-qr-manual-decision="" className={mobile ? "min-h-[calc(100dvh-80px-env(safe-area-inset-top))] overflow-x-hidden bg-[var(--brand-page)] px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-4" : "min-w-0 rounded-3xl border border-[var(--brand-border-soft)] bg-white p-6 shadow-sm"}>
    <h2 className="mb-4 text-xl font-extrabold text-[var(--brand-primary)]">Decisión de ingreso</h2>
    <AccessPersonCard person={result.user} mobile={mobile} showContact={!mobile} showStatus={!mobile}/>
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-4">
      <Info className="mt-0.5 size-5 shrink-0 text-[var(--brand-secondary)]"/>
      <div className="min-w-0"><p className="font-bold text-[var(--brand-primary)]">QR válido · Decisión manual requerida</p><p className="mt-1 text-sm text-[var(--brand-ink)]">{result.message}</p><p className="mt-2 text-xs text-[var(--brand-muted)]">Esta decisión registra solo el acceso al establecimiento. No registra asistencia.</p></div>
    </div>
    <div className={mobile ? "mt-4 rounded-3xl border border-[var(--brand-border-soft)] bg-white p-4" : "mt-4 grid gap-4"}>
      <ManualAccessDecisionControls observation={observation} loading={loading} onObservation={onObservation} onRegister={onRegister} mobile={mobile}/>
      {error ? <p role="alert" className="mt-3 text-sm font-semibold text-destructive">{error}</p> : null}
    </div>
  </section>;
}
