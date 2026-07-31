import { ExternalLink, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { ManagedUser } from "../../types/management.types";

type UserRoleCardProps = {
  user: ManagedUser;
};

export function UserRoleCard({ user }: UserRoleCardProps) {
  return (
    <section className="rounded-lg border border-[#dfe7dc] bg-white px-6 py-5">
      <h3 className="flex items-center gap-3 text-base font-extrabold text-primary">
        <LockKeyhole className="h-5 w-5" />
        Permisos / Rol
      </h3>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <dl className="grid gap-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
            <dt className="font-bold text-foreground/75">Rol asignado</dt>
            <dd className="font-medium text-foreground/80">{user.role}</dd>
          </div>
          <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
            <dt className="font-bold text-foreground/75">Permisos</dt>
            <dd className="font-medium text-foreground/80">
              {user.permissionsSummary}
            </dd>
          </div>
        </dl>

        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-lg border-[#d8ddd4] px-6 font-bold hover:bg-[#edf5e7] hover:text-primary"
        >
          Ver permisos
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
