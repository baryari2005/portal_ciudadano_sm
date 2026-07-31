// src/components/import-users/ExcelHeadersDialog.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileSpreadsheetIcon } from "lucide-react";

export default function ExcelHeadersDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-sm p-0">
        <DialogHeader className="px-5 pt-4 pb-2">
          <DialogTitle className="text-sm-plus font-semibold flex">
            <FileSpreadsheetIcon className="w-4 h-4 mr-2" />
            Encabezados esperados del Excel
          </DialogTitle>
          <Separator className="mt-4 mb-4" />
          <DialogDescription className="text-sm-plus  justify-center">
            Usá estos nombres de columna para que el import haga el mapeo
            automático. Si alguno no está, se toma como <code>null</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 grid-cols-2 px-5 pb-4">
          {/* <div className="grid grid-cols-2 gap-2 text-sm mt-2"> */}
          <div className="space-y-1.5">
            <Label className="text-sm">userId</Label>
            <Label className="text-sm">tipoDocumento</Label>
            <Label className="text-sm">documento</Label>
            <Label className="text-sm">cuil</Label>
            <Label className="text-sm">email</Label>
            <Label className="text-sm">nombre</Label>
            <Label className="text-sm">apellido</Label>
            <Label className="text-sm">fechaNacimiento</Label>
            <Label className="text-sm">celular</Label>
            <Label className="text-sm">domicilio</Label>
            <Label className="text-sm">codigoPostal</Label>
            <Label className="text-sm">estadoCivil</Label>
            <Label className="text-sm">nacionalidad</Label>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">numeroLegajo</Label>
            <Label className="text-sm">genero</Label>
            <Label className="text-sm">matriculaProvincial</Label>
            <Label className="text-sm">matriculaNacional</Label>
            <Label className="text-sm">fechaIngreso</Label>
            <Label className="text-sm">fechaEgreso</Label>
            <Label className="text-sm">estadoLaboral</Label>
            <Label className="text-sm">tipoContrato</Label>
            <Label className="text-sm">puesto</Label>
            <Label className="text-sm">area</Label>
            <Label className="text-sm">departamento</Label>
            <Label className="text-sm">categoria</Label>
            <Label className="text-sm">observaciones</Label>
          </div>
        </div>

        <div className="grid gap-3 px-5 pb-4">
          <Label className="text-xs text-muted-foreground">
            Opcionales:
            <Label className="text-xs text-muted-foreground border-l-2 pl-2">
              genero, matriculaProvincial, matriculaNacional, estadoLaboral,
              tipoContrato, puesto, area, departamento, categoria, observaciones
            </Label>
            .
          </Label>
        </div>

        <DialogFooter className="px-5 py-3 bg-muted/40 border-t rounded-none">
          <DialogClose asChild>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded bg-[#008C93] hover:bg-[#007381] cursor-pointer"
            >
              Cerrar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
