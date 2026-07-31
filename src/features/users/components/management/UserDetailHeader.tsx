import { CalendarDays } from "lucide-react";

import type { ManagedUser } from "../../types/management.types";
import { RolePill, StatusPill } from "./StatusPill";
import { UserAvatarMark } from "./UserAvatarMark";

type UserDetailHeaderProps = {
  user: ManagedUser;
};

export function UserDetailHeader({ user }: UserDetailHeaderProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
      <div className="flex min-w-0 items-center gap-6">
        <UserAvatarMark user={user} size="lg" />

        <div className="min-w-0">
          <h2 className="truncate text-2xl font-extrabold text-foreground">
            {user.fullName}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="font-bold text-foreground/75">{user.userId}</span>
            <RolePill role={user.role} />
          </div>
          <p className="mt-2 truncate text-base text-foreground/70">
            {user.email}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-start gap-4 lg:items-end">
        <StatusPill status={user.status} />
        <div className="flex items-start gap-3 text-sm text-foreground/70">
          <CalendarDays className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p>Fecha de registro</p>
            <p className="font-semibold text-foreground">{user.registeredAt}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
