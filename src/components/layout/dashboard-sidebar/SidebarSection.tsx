"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  label: string;
  collapsed?: boolean;
  open?: boolean;
  onToggle?: () => void;
};

export function SidebarSection({ label, collapsed, open, onToggle }: Props) {
  if (collapsed) return null;

  if (!onToggle) {
    return (
      <div className="mx-5 mb-2 mt-5 text-[10px] font-semibold uppercase tracking-wider text-white/45 transition-opacity duration-200">
        {label}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="mx-5 mb-1 mt-4 flex h-8 w-[calc(100%-2.5rem)] items-center justify-between rounded-lg px-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)]"
    >
      <span>{label}</span>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 transition-transform duration-200",
          open && "rotate-180",
        )}
      />
    </button>
  );
}
