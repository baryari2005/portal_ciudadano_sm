"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** The same observation rule and decision controls for manual search and QR exceptions. */
export function ManualAccessDecisionControls({ observation, loading, onObservation, onRegister, mobile = false }: {
  observation: string; loading: boolean; onObservation: (value: string) => void;
  onRegister: (decision: "ALLOW" | "REJECT") => Promise<void>; mobile?: boolean;
}) {
  const disabled = loading || observation.trim().length < 5 || observation.trim().length > 500;
  return <>
    <Textarea aria-label="Observación obligatoria para el registro manual" value={observation} onChange={event => onObservation(event.target.value)} placeholder="Observación obligatoria para el registro manual" className={mobile ? "min-h-32 w-full resize-y rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)]" : "min-h-28 rounded-xl border-[var(--brand-border)] bg-white"}/>
    <p className={`${mobile ? "mt-2 " : ""}text-xs text-[var(--brand-muted)]`}>Mínimo 5 caracteres. La acción quedará auditada.</p>
    <div className={mobile ? "mt-4 grid gap-2 min-[375px]:grid-cols-2" : "flex flex-wrap gap-3"}>
      <Button type="button" disabled={disabled} onClick={() => void onRegister("ALLOW")} className={mobile ? "h-12 rounded-xl bg-[var(--brand-primary)] px-2 font-bold text-white" : "h-11 rounded-xl bg-[var(--brand-primary)] font-bold text-white hover:bg-[var(--brand-primary-hover)]"}>Permitir ingreso</Button>
      <Button type="button" variant="outline" disabled={disabled} onClick={() => void onRegister("REJECT")} className={mobile ? "h-12 rounded-xl border-[var(--brand-primary)] bg-white px-2 font-bold text-[var(--brand-primary)]" : "h-11 rounded-xl border-[var(--brand-primary)] bg-white font-bold text-[var(--brand-primary)]"}>Rechazar ingreso</Button>
    </div>
  </>;
}
