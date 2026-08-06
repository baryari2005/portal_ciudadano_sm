"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Props = {
  avatarUrl?: string;
  fullName: string;
  email: string;
};

export function UserMenuHeader({ avatarUrl, fullName, email }: Props) {
  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US";

  return (
    <div className="bg-[#F7FAF3] p-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border border-[var(--brand-secondary)]/30 bg-white shadow-sm">
          <AvatarImage src={avatarUrl} alt={fullName} />
          <AvatarFallback className="bg-[#E9F3D8] font-semibold text-[var(--brand-primary)]">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-5 text-[var(--brand-primary)]">
            {fullName}
          </div>
          <div className="truncate text-xs text-[#6B756D]">{email}</div>
        </div>
      </div>
    </div>
  );
}
