// src/components/import-users/UploadField.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconInput } from "@/components/forms/IconInput";
import { Upload, Info } from "lucide-react";
import { Source } from "../types/types";

export default function UploadField({
  source,
  accept,
  onPdfUpload,
  onExcelUpload,
  onOpenHeaders,
}: {
  source: Source;
  accept: string;
  onPdfUpload: (files: FileList | null) => void;
  onExcelUpload: (file: File | null) => void;
  onOpenHeaders: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {source === "pdf"
          ? "Seleccioná uno o varios PDFs"
          : "Seleccioná un Excel/CSV"}
      </Label>

      {source === "pdf" ? (
        <IconInput
          id="file"
          leftIcon={<Upload className="h-4 w-4 text-muted-foreground" />}
          input={
            <Input
              type="file"
              accept={accept}
              multiple
              className="h-11 rounded border pl-9 pr-3"
              onChange={(e) => onPdfUpload(e.target.files)}
            />
          }
        />
      ) : (
        <IconInput
          id="file"
          leftIcon={<Upload className="h-4 w-4 text-muted-foreground" />}
          input={
            <Input
              type="file"
              accept={accept}
              multiple
              className="h-11 rounded border pl-9 pr-3"
              onChange={(e) => onExcelUpload(e.target.files?.[0] || null)}
            />
          }
        />
      )}

      {source === "excel" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Encabezados esperados...</span>
          <button
            type="button"
            onClick={onOpenHeaders}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 cursor-pointer"
            aria-label="Ver encabezados esperados"
          >
            <Info className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
