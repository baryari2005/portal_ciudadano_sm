import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DOCUMENTATION_STATUS } from "../helpers/documentation-status";
import type { EnrollmentDocumentationSummary } from "../types/enrollment-document.types";
export function DocumentationStatusBadge({ summary, compact=false }: { summary:EnrollmentDocumentationSummary; compact?:boolean }) { const item=DOCUMENTATION_STATUS[summary.status],Icon=item.icon; if(compact&&summary.status==="NO_REQUERIDA")return null; const suffix=summary.missingCount?` · Faltan ${summary.missingCount}`:summary.rejectedCount?` · ${summary.rejectedCount} ${summary.rejectedCount===1?"rechazo":"rechazos"}`:""; return <Badge variant="outline" className={cn("w-fit gap-1.5 rounded-full px-2.5 py-1 font-bold",item.className)}><Icon className="size-3.5" aria-hidden="true"/>{item.label}{suffix}</Badge>; }
