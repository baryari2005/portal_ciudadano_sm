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
  mobileRequestAccess = false,
  children,
}: {
  sections: AdminWorkflowSection[];
  activeSection: number;
  onSectionChange: (section: number) => void;
  navigationLabel: string;
  fullWidth?: boolean;
  mobileRequestAccess?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={fullWidth ? "grid items-start gap-5" : "grid items-start gap-3 md:gap-5 lg:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)] 2xl:gap-6"}>
      {!fullWidth ? <aside className={`h-fit min-w-0 self-start shadow-sm lg:sticky lg:top-0 ${mobileRequestAccess ? "rounded-2xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-2 text-[var(--brand-primary)] md:rounded-3xl md:border-0 md:bg-[var(--brand-primary)] md:p-4 md:text-white" : "rounded-3xl bg-[var(--brand-primary)] p-4 text-white"}`}>
        <p className={`${mobileRequestAccess ? "hidden md:block" : "block"} px-3 pb-3 text-xs font-bold uppercase text-[#BFD0C5]`}>{navigationLabel}</p>
        <nav className={mobileRequestAccess ? "flex snap-x gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-1" : "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1"}>
          {sections.map(({ id, label, icon: Icon, status }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSectionChange(id)}
                className={`flex items-center gap-3 text-left font-bold transition-colors ${mobileRequestAccess ? "min-h-10 min-w-[104px] snap-start rounded-lg border border-[var(--brand-border-soft)] bg-white px-2 py-1.5 text-xs text-[var(--brand-primary)] md:min-h-12 md:min-w-0 md:rounded-xl md:border-0 md:bg-transparent md:px-3 md:py-2 md:text-sm md:text-white" : "min-h-12 rounded-xl px-3 py-2 text-sm"} ${active ? mobileRequestAccess ? "!bg-[var(--brand-primary)] !text-white md:!bg-[#DDF28A] md:!text-[var(--brand-ink)]" : "bg-[#DDF28A] text-[var(--brand-ink)]" : status === "unsaved" && !mobileRequestAccess ? "bg-amber-300/20 text-amber-100" : "hover:bg-white/10"}`}
              >
                <span className={`grid shrink-0 place-items-center bg-white/10 ${mobileRequestAccess ? "size-7 rounded-full md:size-8 md:rounded-lg" : "size-8 rounded-lg"}`}>{mobileRequestAccess && status === "valid" ? <Check className="size-5"/> : <Icon className="size-5" />}</span>
                <span className={mobileRequestAccess ? "min-w-0 flex-1 md:hidden" : "min-w-0 flex-1"}>{mobileRequestAccess ? `Paso ${id}` : label}</span>
                {mobileRequestAccess ? <span className="hidden min-w-0 flex-1 md:block">{label}</span> : null}
                <span className={mobileRequestAccess ? "hidden md:contents" : "contents"}>{status === "valid" ? <Check className="size-5 text-emerald-300" /> : status === "invalid" ? <X className="size-5 text-red-300" /> : status === "unsaved" ? <span className="size-2.5 rounded-full bg-amber-300" title="Cambios sin guardar" /> : <span className="size-2.5 rounded-full border border-white/40" title="Sin guardar" />}</span>
              </button>
            );
          })}
        </nav>
      </aside> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
