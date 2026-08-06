"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, CircleCheck, CircleX, ClipboardCheck, FileCheck2, Info, Loader2, MessageSquareText, Save, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AdminRecordLayout, AdminRecordSectionContent } from "@/components/shared/admin-record-layout";
import { AdminDetailPanel } from "@/components/shared/admin-patterns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { UserAttendanceHistory } from "@/features/attendance/components/UserAttendanceHistory";
import { EnrollmentsPage } from "@/features/enrollments/components/EnrollmentsPage";
import { UserDocumentsAdminPage } from "@/features/user-documents/components/UserDocumentsAdminPage";
import { axiosInstance } from "@/lib/axios";

import { getManagedUserRecord } from "../../services/users-management.service";
import type { ManagedUser } from "../../types/management.types";
import { USER_RECORD_SECTIONS, type UserRecordSection } from "../../constants/user-record-sections";
import { UserDetailPanel } from "../management/UserDetailPanel";

const sections = [
  { id: "overview", label: "Resumen", icon: UserRound },
  { id: "documents", label: "Documentos", icon: FileCheck2 },
  { id: "enrollments", label: "Inscripciones", icon: ClipboardCheck },
  { id: "attendance", label: "Asistencias", icon: Activity },
  { id: "participation", label: "Participación", icon: AlertTriangle },
] as const;

export function UserRecordPage({ userId, section }: { userId: string; section: UserRecordSection }) {
  const router = useRouter();
  const normalizedSection = section === "access" ? "overview" : section;
  const [activeSection, setActiveSection] = useState<UserRecordSection>(normalizedSection);
  const [sectionLoading, setSectionLoading] = useState(["documents", "enrollments", "attendance"].includes(normalizedSection));
  const [user, setUser] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try { setUser(await getManagedUserRecord(userId)); }
    catch { setError(true); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [userId]);
  useEffect(() => {
    setActiveSection(normalizedSection);
    if (section === "access") window.history.replaceState(null, "", `/users/${userId}/record/overview`);
  }, [normalizedSection, section, userId]);
  useEffect(() => {
    const syncFromHistory = () => {
      const routeSection = window.location.pathname.split("/").at(-1) as UserRecordSection;
      const current = routeSection === "access" ? "overview" : routeSection;
      if (USER_RECORD_SECTIONS.includes(current)) {
        setSectionLoading(["documents", "enrollments", "attendance"].includes(current));
        setActiveSection(current);
      }
    };
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);

  function selectSection(nextSection: UserRecordSection) {
    if (nextSection === activeSection) return;
    setSectionLoading(["documents", "enrollments", "attendance"].includes(nextSection));
    window.history.pushState(null, "", `/users/${userId}/record/${nextSection}`);
    setActiveSection(nextSection);
  }
  return (
    <AdminRecordLayout
      title="Ficha completa del ciudadano"
      description={user ? `Ficha integral de ${user.fullName} · DNI ${user.dni} · Rol ${user.role}` : "Información integral del ciudadano"}
      icon={UserRound}
      backHref="/users"
      sections={sections}
      activeSection={activeSection === "access" ? "overview" : activeSection}
      onSectionChange={selectSection}
      navigationDisabled={loading}
      loading={loading || sectionLoading}
      loadingLabel="información del ciudadano"
      contentClassName={["overview", "participation"].includes(activeSection) ? "border-0 bg-transparent p-0 shadow-none sm:p-0" : undefined}
    >
      {error || (!loading && !user) ? <p>No pudimos cargar la ficha del usuario.</p> : null}
      {user && activeSection === "overview" ? <UserDetailPanel user={user} onBack={() => router.push("/users")} onUserChanged={load} compact showFullRecordAction={false} /> : null}
      {user && activeSection === "documents" ? <RecordCard title="Documentos del ciudadano" description="Consultá, aprobá o rechazá la documentación presentada."><UserDocumentsAdminPage userId={user.id} embedded onLoadingChange={setSectionLoading} /></RecordCard> : null}
      {user && activeSection === "enrollments" ? <RecordCard title="Inscripciones del ciudadano" description="Consultá sus actividades y la documentación que todavía necesita presentar."><EnrollmentsPage userId={user.id} embedded onLoadingChange={setSectionLoading} /></RecordCard> : null}
      {user && activeSection === "attendance" ? <RecordCard title="Asistencias" description="Historial de presentes, ausentes y justificaciones."><UserAttendanceHistory userId={user.id} onLoadingChange={setSectionLoading} /></RecordCard> : null}
      {user && activeSection === "participation" ? <AdminDetailPanel><ParticipationSection user={user} onSaved={load} /></AdminDetailPanel> : null}
    </AdminRecordLayout>
  );
}

function RecordCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <AdminRecordSectionContent title={title} description={description} icon={Info}>{children}</AdminRecordSectionContent>;
}

function ParticipationSection({ user, onSaved }: { user: ManagedUser; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState(user.participationStatus ?? "HABILITADO");
  const [justified, setJustified] = useState(user.justifiedAbsenceThreshold?.toString() ?? "");
  const [unjustified, setUnjustified] = useState(user.unjustifiedAbsenceThreshold?.toString() ?? "");
  const [observations, setObservations] = useState(user.participationObservations ?? "");
  const [saving, setSaving] = useState(false);
  async function save() { setSaving(true); try { await axiosInstance.patch(`/users/${user.id}/participation`, { status, justifiedAbsenceThreshold: justified ? Number(justified) : null, unjustifiedAbsenceThreshold: unjustified ? Number(unjustified) : null, observations: observations.trim() || null }); await onSaved(); toast.success("Política de participación actualizada."); } catch { toast.error("No pudimos actualizar la participación."); } finally { setSaving(false); } }
  const participationEnabled = status === "HABILITADO";
  return <RecordCard title="Participación" description="Control administrativo de ausencias y habilitación del ciudadano."><div className="grid gap-4 lg:grid-cols-3"><div className="space-y-2"><Label>Ausencias justificadas</Label><div className="relative"><CircleCheck className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--brand-primary)]" /><Input type="number" min={1} value={justified} onChange={(event) => setJustified(event.target.value)} className="h-11 rounded-xl border-[var(--brand-border)] bg-white pl-10 shadow-sm" /></div></div><div className="space-y-2"><Label>Ausencias injustificadas</Label><div className="relative"><CircleX className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--brand-primary)]" /><Input type="number" min={1} value={unjustified} onChange={(event) => setUnjustified(event.target.value)} className="h-11 rounded-xl border-[var(--brand-border)] bg-white pl-10 shadow-sm" /></div></div><div className="space-y-2"><Label>Estado de participación</Label><div className="flex h-11 items-center justify-between rounded-xl border border-[var(--brand-border)] bg-white px-4 shadow-sm"><span className="text-sm font-bold text-[var(--brand-primary)]">{participationEnabled ? "Activa" : status === "EN_REVISION" ? "En revisión" : "Inactiva"}</span><Switch checked={participationEnabled} onCheckedChange={(checked) => setStatus(checked ? "HABILITADO" : "SUSPENDIDO_PROVISORIO")} aria-label="Activar o desactivar participación" /></div></div><div className="space-y-2 lg:col-span-3"><Label>Observaciones administrativas</Label><div className="relative"><MessageSquareText className="pointer-events-none absolute left-3 top-3 z-10 size-4 text-[var(--brand-primary)]" /><Textarea value={observations} onChange={(event) => setObservations(event.target.value)} rows={5} className="resize-none rounded-xl border-[var(--brand-border)] bg-white pl-10 shadow-sm" placeholder="Agregá información relevante sobre la participación del ciudadano..." /></div></div></div><Separator className="my-6 bg-[var(--brand-border)]" /><Button disabled={saving} className="h-12 rounded-xl bg-[var(--brand-primary)] px-7 text-base font-bold text-white hover:bg-[var(--brand-primary-hover)]" onClick={() => void save()}>{saving ? <Loader2 className="animate-spin" /> : <Save />}Guardar política</Button></RecordCard>;
}
