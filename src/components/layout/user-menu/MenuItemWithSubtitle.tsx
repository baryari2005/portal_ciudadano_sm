// components/MenuItemWithSubtitle.tsx
"use client";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils"; // si no tenés cn, podés omitirlo

export function MenuItemWithSubtitle({
  icon: Icon,
  title,
  subtitle,
  onClick,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className={cn(
        "mx-2 rounded-xl px-3 py-3 text-[var(--brand-primary)] transition-colors focus:bg-[#F1F7EA] focus:text-[var(--brand-primary)]",
        "gap-3 items-start",
        className,
      )}
    >
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-secondary)]/12 text-[var(--brand-primary)]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-[var(--brand-primary)]">{title}</span>
        <span className="text-xs text-[#6B756D]">{subtitle}</span>
      </div>
    </DropdownMenuItem>
  );
}
