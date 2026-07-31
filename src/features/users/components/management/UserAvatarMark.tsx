import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { ManagedUser } from "../../types/management.types";

type UserAvatarMarkProps = {
  user: Pick<ManagedUser, "avatarUrl" | "initials" | "fullName">;
  size?: "sm" | "lg";
};

const sizeClasses = {
  sm: "h-12 w-12 text-base",
  lg: "h-16 w-16 text-xl",
};

export function UserAvatarMark({ user, size = "sm" }: UserAvatarMarkProps) {
  return (
    <Avatar
      aria-label={user.fullName}
      className={`${sizeClasses[size]} shrink-0 rounded-xl border border-[var(--brand-border-soft)] bg-[var(--brand-primary)] shadow-sm`}
    >
      <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName} />
      <AvatarFallback className="rounded-xl bg-[var(--brand-primary)] font-extrabold text-white">
        {user.initials}
      </AvatarFallback>
    </Avatar>
  );
}
