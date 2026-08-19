"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, BookOpenCheck, HelpCircle, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspaceEstablishment } from "@/features/workspace-establishment/WorkspaceEstablishmentProvider";

const ACCOUNT_ROUTES = ["/teacher/profile", "/teacher/notifications", "/teacher/help"];

export function TeacherAssignmentGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { options } = useWorkspaceEstablishment();

  if (options.length > 0 || ACCOUNT_ROUTES.some((route) => pathname.startsWith(route))) {
    return <>{children}</>;
  }

  return (
    <Card className="mx-auto mt-8 max-w-3xl rounded-3xl border-[var(--brand-border-soft)] bg-white shadow-sm">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center sm:px-10">
        <span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-panel)] text-[var(--brand-primary)]">
          <BookOpenCheck className="size-8" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-[var(--brand-primary)]">
          Todavía no tenés actividades asignadas
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--brand-muted)]">
          Cuando Administración te asigne como profesor de un horario, el establecimiento, las clases y las asistencias aparecerán en este portal.
        </p>
        <p className="mt-2 max-w-xl text-sm font-medium text-[var(--brand-primary)]">
          Mientras tanto podés consultar tu perfil, las notificaciones y el centro de ayuda.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline"><Link href="/teacher/profile"><UserRound />Mi perfil</Link></Button>
          <Button asChild variant="outline"><Link href="/teacher/notifications"><BellRing />Notificaciones</Link></Button>
          <Button asChild><Link href="/teacher/help"><HelpCircle />Ayuda</Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}
