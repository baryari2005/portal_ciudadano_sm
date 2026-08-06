"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Home, Plus, UserPlus } from "lucide-react";
import { UserForm } from "@/features/users/components/UserForm";
import { Button } from "@/components/ui/button";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/components/shared/admin-patterns";

export function ReceptionRequestAccessPage() {
  const [completed, setCompleted] = useState(false);
  if (completed) return <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8"><section className="mx-auto flex min-h-[480px] max-w-2xl flex-col items-center justify-center rounded-3xl border border-[var(--brand-border-soft)] bg-white p-8 text-center shadow-sm"><span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><CheckCircle2 className="size-9" /></span><h1 className="mt-5 text-3xl font-extrabold text-[var(--brand-primary)]">Solicitud enviada</h1><p className="mt-3 max-w-md text-[var(--brand-muted)]">La solicitud de acceso quedó pendiente de revisión por un administrador.</p><div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center"><Button type="button" className={adminPrimaryButtonClass} onClick={() => setCompleted(false)}><Plus />Crear otra solicitud</Button><Button asChild variant="outline" className={adminSecondaryButtonClass}><Link href="/reception"><Home />Volver al Dashboard</Link></Button></div></section></main>;

  return <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full overflow-y-auto bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8"><UserForm mode="create" submissionMode="reception-request" fixedRoleCode="citizen" backHref="/reception/citizens" title="Solicitar acceso" description="Cargá los datos de la persona para enviar una solicitud de acceso al portal." headerIcon={UserPlus} submitLabel="Enviar solicitud" onSuccess={() => setCompleted(true)} /></main>;
}
