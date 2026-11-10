"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCan } from "@/hooks/useCan";
import { useAuth } from "@/stores/auth";
import { useUserImages } from "../../hooks/useUserImages";

import type { ManagedUser } from "../../types/management.types";

type UserAvatarMarkProps = {
  user: Pick<ManagedUser, "id" | "avatarUrl" | "initials" | "fullName">;
  size?: "sm" | "lg";
};

const sizeClasses = {
  sm: "h-12 w-12 text-base",
  lg: "h-16 w-16 text-xl",
};

export function UserAvatarMark({ user, size = "sm" }: UserAvatarMarkProps) {
  const ownId = useAuth(state => state.user?.id);
  const canReadRecord = useCan("user_records", "ver");
  const images = useUserImages(canReadRecord || ownId === user.id ? user.id : undefined, user.avatarUrl);
  return (
    <Avatar
      aria-label={user.fullName}
      className={`${sizeClasses[size]} shrink-0 rounded-xl border border-[var(--brand-border-soft)] bg-[var(--brand-primary)] shadow-sm`}
    >
      <AvatarImage src={(images ? images.avatarUrl : user.avatarUrl) ?? undefined} alt={user.fullName} />
      <AvatarFallback className="rounded-xl bg-[var(--brand-primary)] font-extrabold text-white">
        {user.initials}
      </AvatarFallback>
    </Avatar>
  );
}
