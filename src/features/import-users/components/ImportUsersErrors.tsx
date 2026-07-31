"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ImportRowError } from "../types/import-users-ui.types";

type Props = {
  errors: ImportRowError[];
};

export default function ImportUsersErrors({ errors }: Props) {
  if (!errors.length) {
    return null;
  }

  return (
    <Card className="border-destructive/40 rounded">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Errores de importación ({errors.length})
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="max-h-96 overflow-y-auto rounded-md border">
          <div className="grid grid-cols-12 gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <div className="col-span-2">Fila</div>
            <div className="col-span-3">Referencia</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-5">Mensaje</div>
          </div>

          <div className="divide-y">
            {errors.map((error) => (
              <div
                key={`${error.source}-${error.index}-${error.rowRef}`}
                className="grid grid-cols-12 gap-2 px-3 py-3 text-sm"
              >
                <div className="col-span-2 font-medium">
                  {error.source.toUpperCase()} #{error.index}
                </div>
                <div className="col-span-3 break-all text-muted-foreground">
                  {error.rowRef}
                </div>
                <div className="col-span-2">{error.status ?? "-"}</div>
                <div className="col-span-5 break-words">{error.message}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
