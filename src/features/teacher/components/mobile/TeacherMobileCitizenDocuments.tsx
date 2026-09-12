"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Eye, FileText } from "lucide-react";
import { MobileCitizenSearch } from "@/components/shared/MobileCitizenSearch";
import type { PersonSearchOption } from "@/components/shared/PersonSearchSelector";
import { UserAvatar } from "@/components/layout/user-menu/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { UserDocumentPreview } from "@/features/user-documents/components/UserDocumentPreview";
import { useCan } from "@/hooks/useCan";
import { useTeacherCitizenDocuments, useTeacherDocumentPreview } from "../../hooks/useTeacherCitizenDocuments";
import { searchTeacherDocumentCitizens, type CitizenDocumentRequirement } from "../../services/teacher-citizen-documents.service";

const statusLabels = { PENDIENTE: "Pendiente", APROBADO: "Aprobado", RECHAZADO: "Rechazado" };
const cardClass = "min-w-0 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4 shadow-sm";

export function TeacherMobileCitizenDocuments() {
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const canRead = useCan("enrollment_documents", "ver");
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setMobile(media.matches);
      if (!media.matches) router.replace("/teacher");
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [router]);

  if (!mobile) return null;
  return <div className="min-h-full min-w-0 md:hidden">{canRead ? <DocumentConsultation /> : <main className="p-4"><BackHeader title="Documentos ciudadanos" onBack={() => router.push("/teacher")} /><Message>Tu usuario no tiene habilitado el permiso para consultar documentos ciudadanos.</Message></main>}</div>;
}

function DocumentConsultation() {
  const [citizen, setCitizen] = useState<PersonSearchOption | null>(null);
  const [selected, setSelected] = useState<CitizenDocumentRequirement | null>(null);
  const { data, error, isLoading, mutate } = useTeacherCitizenDocuments(citizen?.id ?? null);

  if (!citizen) return <MobileCitizenSearch search={searchTeacherDocumentCitizens} onSelect={setCitizen} title="Documentos ciudadanos" description="Buscá a una persona para consultar su documentación." placeholder="Buscar por DNI, nombre, apellido o email..." />;
  if (isLoading) return <CatalogLoadingState label="documentos de la persona" fullPage />;
  if (selected) return <DocumentDetail requirement={selected} onBack={() => setSelected(null)} />;

  // Only submitted documents are listed: the generic requirement catalog does not
  // establish which missing documents are mandatory for this particular citizen.
  const documents = data?.filter((requirement) => requirement.current) ?? [];
  return <main className="min-w-0 px-4 pb-6 pt-4">
    <BackHeader title="Documentos de la persona" onBack={() => setCitizen(null)} />
    {error ? <Message><p>No pudimos consultar la documentación. Verificá que tu usuario tenga acceso.</p><Button variant="outline" className="mt-3" onClick={() => void mutate()}>Reintentar</Button></Message> : <>
      <section className={`${cardClass} mt-4 flex items-center gap-3`}>
        <UserAvatar src={citizen.avatarUrl || citizen.identityPhotoUrl || undefined} name={citizen.fullName} className="size-14 shrink-0 rounded-full" imageClassName="size-full rounded-full object-cover" fallbackBgClass="rounded-full bg-[var(--brand-panel)]" textClass="font-extrabold text-[var(--brand-primary)]" />
        <div className="min-w-0"><h2 className="break-words font-extrabold text-[var(--brand-primary)]">{citizen.fullName}</h2><p className="mt-1 break-words text-xs text-[var(--brand-muted)]">DNI {citizen.documentNumber || "No informado"}</p><p className="break-all text-xs text-[var(--brand-muted)]">{citizen.email || "Email no informado"}</p></div>
      </section>
      <section className="mt-3 grid content-start gap-3">
        {documents.length ? documents.map((requirement) => <button type="button" key={requirement.id} onClick={() => setSelected(requirement)} className={`${cardClass} grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 text-left`}>
          <FileText className="mt-1 size-6 text-[var(--brand-primary)]" />
          <div className="min-w-0"><h2 className="break-words font-extrabold text-[var(--brand-primary)]">{requirement.current?.requirementName || requirement.name}</h2><DocumentFacts requirement={requirement} /></div>
          <ChevronRight className="size-5 text-[var(--brand-secondary)]" />
        </button>) : <Message>No hay documentación disponible para esta persona.</Message>}
      </section>
    </>}
  </main>;
}

function DocumentDetail({ requirement, onBack }: { requirement: CitizenDocumentRequirement; onBack: () => void }) {
  const [preview, setPreview] = useState(false);
  const document = requirement.current;
  const { data: url, error, isLoading, mutate } = useTeacherDocumentPreview(preview ? document?.id ?? null : null);
  if (isLoading) return <CatalogLoadingState label="vista previa del documento" fullPage />;
  return <main className="min-w-0 px-4 pb-6 pt-4">
    <BackHeader title="Detalle de documento" onBack={onBack} />
    <section className={`${cardClass} mt-4`}>
      <FileText className="mb-3 size-7 text-[var(--brand-primary)]" />
      <h1 className="break-words text-xl font-extrabold text-[var(--brand-primary)]">{document?.requirementName || requirement.name}</h1>
      <DocumentFacts requirement={requirement} />
      {document?.rejectionReason ? <p className="mt-3 whitespace-pre-wrap break-words text-sm text-red-700">Motivo del rechazo: {document.rejectionReason}</p> : null}
      {document?.citizenObservations ? <p className="mt-3 whitespace-pre-wrap break-words text-sm text-[var(--brand-muted)]">Observaciones: {document.citizenObservations}</p> : null}
      {document && !preview ? <Button variant="outline" className="mt-4 h-12 w-full rounded-xl border-[var(--brand-border)] text-[var(--brand-primary)]" onClick={() => setPreview(true)}><Eye />Ver documento</Button> : null}
    </section>
    {error ? <Message><p>No pudimos abrir el archivo.</p><Button variant="outline" className="mt-3" onClick={() => void mutate()}>Reintentar</Button></Message> : document && url ? <section className="relative mt-3 min-w-0 overflow-hidden rounded-2xl border border-[var(--brand-border-soft)] bg-white"><UserDocumentPreview url={url} mimeType={document.mimeType} originalName={document.originalName} /></section> : null}
  </main>;
}

function DocumentFacts({ requirement }: { requirement: CitizenDocumentRequirement }) {
  const document = requirement.current;
  if (!document) return null;
  return <div className="mt-2 space-y-2 break-words text-xs text-[var(--brand-muted)]">
    <Badge variant="outline" className="border-[var(--brand-secondary)]/40 bg-[var(--brand-highlight)] text-[var(--brand-primary)]">{statusLabels[document.status]}</Badge>
    {requirement.instructions ? <p className="whitespace-pre-wrap">{requirement.instructions}</p> : null}
    {document.uploadedAt ? <p>Documento cargado: {new Date(document.uploadedAt).toLocaleDateString("es-AR")}</p> : null}
    {document.reviewedAt ? <p>Revisado: {new Date(document.reviewedAt).toLocaleDateString("es-AR")}</p> : null}
    <p className="break-all">{document.originalName}</p>
  </div>;
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="flex min-w-0 items-center gap-2"><Button type="button" variant="ghost" size="icon" className="shrink-0 text-[var(--brand-primary)]" onClick={onBack} aria-label="Volver"><ArrowLeft /></Button><h2 className="text-xl font-extrabold text-[var(--brand-primary)]">{title}</h2></header>;
}

function Message({ children }: { children: React.ReactNode }) {
  return <div role="status" className="mt-4 rounded-2xl border border-dashed border-[var(--brand-border)] bg-white/70 p-5 text-center text-sm text-[var(--brand-muted)]">{children}</div>;
}
