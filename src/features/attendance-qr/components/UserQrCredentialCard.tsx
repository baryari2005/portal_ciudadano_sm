"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Clock3, Loader2, Printer, QrCode, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useCan } from "@/hooks/useCan";
import { getUserQrStatusClient, issueUserQrClient, revokeUserQrClient } from "../services/attendance-qr.service";
import type { UserQrCredentialSummary } from "../types/attendance-qr.types";

const actionClassName = "h-12 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] px-7 text-base font-bold text-[var(--brand-primary)] shadow-sm hover:bg-[var(--brand-panel)]";
const qrOptions = { width: 420, margin: 2, color: { dark: "var(--brand-heading)", light: "#FFFFFF" } };

export function UserQrCredentialCard({ userId, onLoadingChange }: { userId: string; onLoadingChange?: (loading: boolean) => void }) {
  const canAssign = useCan("usuarios", "asignar");
  const [status, setStatus] = useState<UserQrCredentialSummary | null>(null);
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<"issue" | "revoke" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const current = await getUserQrStatusClient(userId);
      setStatus(current);
      setQr(current.status === "ACTIVO" && current.token ? await QRCode.toDataURL(current.token, qrOptions) : "");
    } catch { toast.error("No pudimos cargar la credencial QR."); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => onLoadingChange?.(loading), [loading, onLoadingChange]);

  async function issue() {
    setProcessing("issue");
    try {
      const result = await issueUserQrClient(userId);
      setStatus(result.credential);
      setQr(await QRCode.toDataURL(result.token, qrOptions));
      toast.success(status?.status === "ACTIVO" ? "Credencial QR reemitida." : "Credencial QR emitida.");
    } catch { toast.error("No pudimos emitir la credencial QR."); }
    finally { setProcessing(null); }
  }

  async function revoke() {
    setProcessing("revoke");
    try { setStatus(await revokeUserQrClient(userId)); setQr(""); toast.success("Credencial QR revocada."); }
    catch { toast.error("No pudimos revocar la credencial QR."); }
    finally { setProcessing(null); }
  }

  if (loading) return <CatalogLoadingState label="QR de ingreso" />;
  const active = status?.status === "ACTIVO";

  return (
    <section className="rounded-[18px] border border-[var(--brand-border)] bg-white/70 p-5 text-center shadow-sm">
      <h3 className="text-sm font-extrabold uppercase text-[var(--brand-heading)]">QR de ingreso</h3>
      <p className="mt-1 text-xs font-medium text-[var(--brand-muted)]">Credencial activa para recepción y asistencia</p>

      <div className="mt-4 grid min-h-56 place-items-center rounded-2xl border border-[var(--brand-border-soft)] bg-[var(--brand-page)] p-3">
        {qr ? <img src={qr} alt="QR de ingreso activo" className="size-52" /> : <div className="max-w-xs py-5"><QrCode className="mx-auto size-14 text-[var(--brand-secondary)]" /><p className="mt-3 text-sm font-bold text-[var(--brand-primary)]">{active ? "Reemití la credencial anterior para visualizarla" : "No hay un QR activo"}</p></div>}
      </div>

      <dl className="mt-4 grid gap-2 text-left sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <InfoRow label="Fecha de emisión" value={status?.issuedAt ? new Date(status.issuedAt).toLocaleString("es-AR") : "Sin emitir"} />
        <InfoRow label="Último uso" value={status?.lastUsedAt ? new Date(status.lastUsedAt).toLocaleString("es-AR") : "Sin usos"} />
      </dl>

      <div className="mt-5 flex flex-wrap justify-center gap-2 border-t border-[var(--brand-border-soft)] pt-4">
        {qr ? <Button type="button" variant="outline" onClick={() => window.print()} className={actionClassName}><Printer />Imprimir</Button> : null}
        {canAssign ? <Button type="button" variant="outline" disabled={processing !== null} onClick={() => void issue()} className={actionClassName}>{processing === "issue" ? <Loader2 className="animate-spin" /> : <RefreshCw />}{active ? "Reemitir" : "Emitir"}</Button> : null}
        {canAssign && active ? <Button type="button" variant="outline" disabled={processing !== null} onClick={() => void revoke()} className={actionClassName}>{processing === "revoke" ? <Loader2 className="animate-spin" /> : <Ban />}Revocar</Button> : null}
      </div>

      {qr ? <div className="hidden print:fixed print:inset-0 print:z-[9999] print:flex print:items-center print:justify-center print:bg-white"><div className="text-center"><h1 className="mb-6 text-2xl font-bold text-black">QR de ingreso</h1><img src={qr} alt="QR de ingreso para imprimir" className="size-[420px]" /></div></div> : null}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex gap-2 rounded-xl bg-[var(--brand-page)] p-3"><Clock3 className="mt-0.5 size-4 shrink-0 text-[var(--brand-primary)]" /><div><dt className="text-[10px] font-bold uppercase text-[var(--brand-muted)]">{label}</dt><dd className="text-xs font-bold text-[var(--brand-ink)]">{value}</dd></div></div>;
}
