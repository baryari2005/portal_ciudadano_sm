import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CitizenMobileMissingDocuments({ documents }: { documents: Array<{ id: string; name: string }> }) {
  if (!documents.length) return null;
  return <section className="min-w-0 rounded-2xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-4 shadow-sm">
    <h3 className="flex items-center gap-3 font-extrabold text-[var(--brand-primary)]"><FileCheck2 className="size-6 shrink-0" />Documentación pendiente</h3>
    <p className="mt-2 text-xs leading-5 text-[var(--brand-muted)]">Para completar los requisitos de esta actividad todavía te falta presentar:</p>
    <ul className="mt-2 list-disc space-y-1 break-words pl-5 text-sm font-bold text-[var(--brand-primary)]">{documents.map((document) => <li key={document.id}>{document.name}</li>)}</ul>
    <Button asChild className="mt-4 h-12 w-full rounded-2xl bg-[var(--brand-primary)] text-sm font-bold text-white hover:bg-[#143A27]"><Link href="/citizen/documents"><FileCheck2 className="shrink-0" />Ir a Mis documentos</Link></Button>
  </section>;
}
