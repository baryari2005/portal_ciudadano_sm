// src/components/import-users/SourceSelector.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Source } from "../types/types";

export default function SourceSelector({
  source,
  setSource,
  clearData,
}: {
  source: Source;
  setSource: (s: Source) => void;
  clearData: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-sm font-extrabold text-[var(--brand-ink)]">Fuente:</Label>

      <div className="inline-flex h-11 overflow-hidden rounded-xl border border-[var(--brand-border)] bg-white/60">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            clearData();
            setSource("pdf");
          }}
          aria-pressed={source === "pdf"}
          className={cn(
            "h-full rounded-none px-5 font-bold focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]",
            source === "pdf"
              ? "bg-[var(--brand-primary-strong)] text-white hover:bg-[var(--brand-heading)] hover:text-white"
              : "text-[var(--brand-primary-strong)] hover:bg-[var(--brand-panel)] hover:text-[var(--brand-heading)]",
          )}
        >
          PDF
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            clearData();
            setSource("excel");
          }}
          aria-pressed={source === "excel"}
          className={cn(
            "h-full -ml-px rounded-none border-l border-[var(--brand-border)] px-5 font-bold focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]",
            source === "excel"
              ? "bg-[var(--brand-primary-strong)] text-white hover:bg-[var(--brand-heading)] hover:text-white"
              : "text-[var(--brand-primary-strong)] hover:bg-[var(--brand-panel)] hover:text-[var(--brand-heading)]",
          )}
        >
          Excel / CSV
        </Button>
      </div>
    </div>
  );
}
