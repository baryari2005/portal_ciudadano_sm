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
      <Label className="text-sm font-extrabold text-[#173C2A]">Fuente:</Label>

      <div className="inline-flex h-11 overflow-hidden rounded-xl border border-[#C9D9C3] bg-white/60">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            clearData();
            setSource("pdf");
          }}
          aria-pressed={source === "pdf"}
          className={cn(
            "h-full rounded-none px-5 font-bold focus-visible:ring-2 focus-visible:ring-[#1D4F36]",
            source === "pdf"
              ? "bg-[#00522C] text-white hover:bg-[#003A22] hover:text-white"
              : "text-[#00522C] hover:bg-[#EEF6E9] hover:text-[#003A22]",
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
            "h-full -ml-px rounded-none border-l border-[#C9D9C3] px-5 font-bold focus-visible:ring-2 focus-visible:ring-[#1D4F36]",
            source === "excel"
              ? "bg-[#00522C] text-white hover:bg-[#003A22] hover:text-white"
              : "text-[#00522C] hover:bg-[#EEF6E9] hover:text-[#003A22]",
          )}
        >
          Excel / CSV
        </Button>
      </div>
    </div>
  );
}
