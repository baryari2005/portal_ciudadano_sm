"use client";

import { LogOut, MousePointerClick, TimerReset } from "lucide-react";

import {
  ProfileDialogBody,
  ProfileDialogFooter,
  ProfileDialogHeader,
  profilePrimaryButtonClassName,
  profileSecondaryButtonClassName,
} from "@/components/layout/user-menu/ProfileDialogParts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  seconds: number;
  onContinue: () => void;
  onLogout: () => void;
};

const COUNTDOWN_TOTAL = 15;

export function IdleLogoutModal({ open, seconds, onContinue, onLogout }: Props) {
  const progress = Math.max(0, Math.min(100, (seconds / COUNTDOWN_TOTAL) * 100));

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="overflow-hidden rounded-2xl border-[#DDE5D8] bg-white p-0 shadow-[0_24px_70px_rgba(0,58,34,0.22)] sm:max-w-md"
      >
        <ProfileDialogHeader
          icon={TimerReset}
          title="Tu sesión está por finalizar"
          description="Detectamos un período prolongado sin actividad. Elegí si querés continuar usando el portal."
        />

        <ProfileDialogBody className="gap-5">
          <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-panel)] p-5 text-center shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--brand-muted)]">
              Cierre automático en
            </p>
            <div className="my-3 flex items-end justify-center gap-2 text-[var(--brand-primary)]" aria-live="polite" aria-atomic="true">
              <strong className="text-6xl font-extrabold leading-none tabular-nums">{seconds}</strong>
              <span className="pb-1 text-sm font-bold">segundos</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white" aria-hidden="true">
              <div className="h-full rounded-full bg-[var(--brand-secondary)] transition-[width] duration-1000 ease-linear" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <p className="text-center text-sm font-medium leading-5 text-[var(--brand-muted)]">
            Si no realizás ninguna acción, cerraremos la sesión para proteger tu cuenta.
          </p>
        </ProfileDialogBody>

        <ProfileDialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={onLogout} className={profileSecondaryButtonClassName}>
            <LogOut /> Cerrar sesión
          </Button>
          <Button type="button" onClick={onContinue} className={profilePrimaryButtonClassName} autoFocus>
            <MousePointerClick /> Continuar sesión
          </Button>
        </ProfileDialogFooter>
      </DialogContent>
    </Dialog>
  );
}
