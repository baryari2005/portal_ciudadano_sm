"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Check, X } from "lucide-react";

export type AdminWorkflowSection = {
  id: number;
  label: string;
  icon: LucideIcon;
  status?: "pending" | "unsaved" | "valid" | "invalid";
};

export function AdminWorkflowLayout({
  sections,
  activeSection,
  onSectionChange,
  navigationLabel,
  fullWidth = false,
  children,
}: {
  sections: AdminWorkflowSection[];
  activeSection: number;
  onSectionChange: (section: number) => void;
  navigationLabel: string;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={fullWidth ? "grid items-start gap-5" : "grid items-start gap-5 lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)] 2xl:gap-6"}>
      {!fullWidth ? <aside className="h-fit self-start rounded-3xl bg-[#1D4F36] p-4 text-white shadow-sm lg:sticky lg:top-0">
        <p className="px-3 pb-3 text-xs font-bold uppercase text-[#BFD0C5]">{navigationLabel}</p>
        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {sections.map(({ id, label, icon: Icon, status }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSectionChange(id)}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors ${active ? "bg-[#DDF28A] text-[#173C2A]" : status === "unsaved" ? "bg-amber-300/20 text-amber-100" : "hover:bg-white/10"}`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10"><Icon className="size-5" /></span>
                <span className="min-w-0 flex-1">{label}</span>
                {status === "valid" ? <Check className="size-5 text-emerald-300" /> : status === "invalid" ? <X className="size-5 text-red-300" /> : status === "unsaved" ? <span className="size-2.5 rounded-full bg-amber-300" title="Cambios sin guardar" /> : <span className="size-2.5 rounded-full border border-white/40" title="Sin guardar" />}
              </button>
            );
          })}
        </nav>
      </aside> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
