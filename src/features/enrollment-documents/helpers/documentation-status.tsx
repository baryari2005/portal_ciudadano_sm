import { AlertTriangle, CheckCircle2, CircleDashed, Clock3, FileX2, type LucideIcon } from "lucide-react";
import type { EnrollmentDocumentationStatus } from "../types/enrollment-document.types";
export const DOCUMENTATION_STATUS: Record<EnrollmentDocumentationStatus, { label:string; description:string; action:string|null; icon:LucideIcon; className:string }> = {
  NO_REQUERIDA:{label:"No requiere documentación",description:"Esta inscripción no requiere documentación.",action:null,icon:FileX2,className:"border-[var(--brand-neutral)]/50 bg-[var(--brand-neutral)]/10 text-[#555]"},
  PENDIENTE:{label:"Documentación pendiente",description:"Faltan documentos por presentar.",action:"Adjuntar documentación",icon:CircleDashed,className:"border-amber-300 bg-amber-50 text-amber-900"},
  EN_REVISION:{label:"En revisión",description:"Hay documentación pendiente de revisión.",action:"Ver documentación",icon:Clock3,className:"border-sky-300 bg-sky-50 text-sky-900"},
  OBSERVADA:{label:"Documentación observada",description:"Existen documentos rechazados que requieren una nueva versión.",action:"Corregir documentación",icon:AlertTriangle,className:"border-red-300 bg-red-50 text-red-800"},
  COMPLETA:{label:"Documentación completa",description:"Todos los documentos obligatorios están aprobados.",action:"Ver documentación",icon:CheckCircle2,className:"border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/15 text-[var(--brand-primary)]"},
};
