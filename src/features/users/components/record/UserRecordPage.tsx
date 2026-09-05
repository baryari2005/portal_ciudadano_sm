"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Contact,
  FileCheck2,
  HeartPulse,
  IdCard,
  Info,
  Loader2,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AdminRecordLayout,
  AdminRecordSectionContent,
} from "@/components/shared/admin-record-layout";
import { AdminDetailPanel } from "@/components/shared/admin-patterns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { UserAttendanceHistory } from "@/features/attendance/components/UserAttendanceHistory";
import { EnrollmentsPage } from "@/features/enrollments/components/EnrollmentsPage";
import { UserDocumentsAdminPage } from "@/features/user-documents/components/UserDocumentsAdminPage";
import { CatalogDetailField } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { axiosInstance } from "@/lib/axios";
import { splitExactAddress } from "@/features/geocoding/helpers/exact-address";

import { getManagedUserRecord } from "../../services/users-management.service";
import type { ManagedUser } from "../../types/management.types";
import {
  USER_RECORD_SECTIONS,
  type UserRecordSection,
} from "../../constants/user-record-sections";
import Image from "next/image";

const sections = [
  { id: "personal-data", label: "Datos personales", icon: UserRound },
  { id: "system-access", label: "Acceso al sistema", icon: ShieldCheck },
  { id: "address", label: "Domicilio", icon: MapPin },
  { id: "contact", label: "Contacto y cobertura", icon: HeartPulse },
  { id: "documents", label: "Documentos", icon: FileCheck2 },
  { id: "enrollments", label: "Inscripciones", icon: ClipboardCheck },
  { id: "attendance", label: "Asistencias", icon: Activity },
  { id: "participation", label: "Participación", icon: AlertTriangle },
] as const;

export function UserRecordPage({
  userId,
  section,
}: {
  userId: string;
  section: UserRecordSection;
}) {
  const searchParams = useSearchParams();
  const personnelSource = searchParams.get("source") === "personnel";
  const sourceQuery = personnelSource ? "?source=personnel" : "";
  const normalizedSection =
    section === "access" || section === "overview" ? "personal-data" : section;
  const [activeSection, setActiveSection] =
    useState<UserRecordSection>(normalizedSection);
  const [sectionLoading, setSectionLoading] = useState(
    ["documents", "enrollments", "attendance"].includes(normalizedSection),
  );
  const [user, setUser] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setUser(await getManagedUserRecord(userId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setActiveSection(normalizedSection);
    if (section === "access" || section === "overview")
      window.history.replaceState(
        null,
        "",
        `/users/${userId}/record/personal-data${sourceQuery}`,
      );
  }, [normalizedSection, section, sourceQuery, userId]);
  useEffect(() => {
    const syncFromHistory = () => {
      const routeSection = window.location.pathname
        .split("/")
        .at(-1) as UserRecordSection;
      const current =
        routeSection === "access" || routeSection === "overview"
          ? "personal-data"
          : routeSection;
      if (USER_RECORD_SECTIONS.includes(current)) {
        setSectionLoading(
          ["documents", "enrollments", "attendance"].includes(current),
        );
        setActiveSection(current);
      }
    };
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);

  function selectSection(nextSection: UserRecordSection) {
    if (nextSection === activeSection) return;
    setSectionLoading(
      ["documents", "enrollments", "attendance"].includes(nextSection),
    );
    window.history.pushState(
      null,
      "",
      `/users/${userId}/record/${nextSection}${sourceQuery}`,
    );
    setActiveSection(nextSection);
  }
  return (
    <AdminRecordLayout
      title={
        personnelSource
          ? "Ficha completa del personal"
          : "Ficha completa del ciudadano"
      }
      description={
        user
          ? `Ficha integral de ${user.fullName} · DNI ${user.dni} · Rol ${user.role}`
          : personnelSource
            ? "Información integral del personal"
            : "Información integral del ciudadano"
      }
      icon={UserRound}
      backHref={personnelSource ? "/personnel" : "/users"}
      sections={sections}
      activeSection={
        activeSection === "access" || activeSection === "overview"
          ? "personal-data"
          : activeSection
      }
      onSectionChange={selectSection}
      navigationDisabled={loading}
      loading={loading || sectionLoading}
      loadingLabel="información del ciudadano"
      contentClassName={
        activeSection === "participation"
          ? "border-0 bg-transparent p-0 shadow-none sm:p-0"
          : undefined
      }
    >
      {error || (!loading && !user) ? (
        <p>No pudimos cargar la ficha del usuario.</p>
      ) : null}
      {user &&
      ["personal-data", "system-access", "address", "contact"].includes(
        activeSection,
      ) ? (
        <CitizenRecordDataSection
          user={user}
          section={
            activeSection as
              | "personal-data"
              | "system-access"
              | "address"
              | "contact"
          }
        />
      ) : null}
      {user && activeSection === "documents" ? (
        <RecordCard
          title="Documentos del ciudadano"
          description="Consultá, aprobá o rechazá la documentación presentada."
        >
          <UserDocumentsAdminPage
            userId={user.id}
            embedded
            onLoadingChange={setSectionLoading}
          />
        </RecordCard>
      ) : null}
      {user && activeSection === "enrollments" ? (
        <RecordCard
          title="Inscripciones del ciudadano"
          description="Consultá sus actividades y la documentación que todavía necesita presentar."
        >
          <EnrollmentsPage
            userId={user.id}
            embedded
            onLoadingChange={setSectionLoading}
          />
        </RecordCard>
      ) : null}
      {user && activeSection === "attendance" ? (
        <RecordCard
          title="Asistencias"
          description="Historial de presentes, ausentes y justificaciones."
        >
          <UserAttendanceHistory
            userId={user.id}
            onLoadingChange={setSectionLoading}
          />
        </RecordCard>
      ) : null}
      {user && activeSection === "participation" ? (
        <AdminDetailPanel>
          <ParticipationSection user={user} onSaved={load} />
        </AdminDetailPanel>
      ) : null}
    </AdminRecordLayout>
  );
}

function CitizenRecordDataSection({
  user,
  section,
}: {
  user: ManagedUser;
  section: "personal-data" | "system-access" | "address" | "contact";
}) {
  const shown = (value?: string | null) => value || "Sin registrar";
  const coordinates =
    user.addressLat != null && user.addressLng != null
      ? `${user.addressLat.toFixed(6)}, ${user.addressLng.toFixed(6)}`
      : "Sin registrar";
  const exactAddress = splitExactAddress(
    user.address === "Sin registrar" ? "" : user.address,
  );
  const personal = [
    { icon: UserRound, label: "Nombre completo", value: user.fullName },
    {
      icon: IdCard,
      label: "Tipo y número de documento",
      value: `${shown(user.documentType)} · ${user.dni}`,
    },
    { icon: IdCard, label: "CUIL", value: shown(user.cuil) },
    { icon: CalendarDays, label: "Fecha de nacimiento", value: user.birthDate },
    { icon: UserRound, label: "Género", value: shown(user.gender) },
    { icon: Contact, label: "Estado civil", value: shown(user.maritalStatus) },
    {
      icon: ShieldCheck,
      label: "Nacionalidad",
      value: shown(user.nationality),
    },
  ];
  const access = [
    { icon: UserRound, label: "Usuario", value: user.userId },
    { icon: Mail, label: "Email", value: user.email },
    { icon: ShieldCheck, label: "Rol", value: user.role },
    { icon: CircleCheck, label: "Estado", value: user.status },
    {
      icon: CircleCheck,
      label: "Perfil",
      value: user.profileComplete ? "Completo" : "Incompleto",
    },
    {
      icon: CalendarDays,
      label: "Fecha de registro",
      value: user.registeredAt,
    },
  ];
  const address = [
    { icon: MapPin, label: "Calle", value: shown(exactAddress.street) },
    { icon: IdCard, label: "Altura", value: shown(exactAddress.number) },
    {
      icon: Contact,
      label: "Piso, departamento, casa o referencia",
      value: shown(exactAddress.complement),
    },
    { icon: MapPin, label: "Dirección completa", value: user.address },
    { icon: MapPin, label: "Localidad", value: shown(user.locality) },
    { icon: MapPin, label: "Provincia", value: shown(user.province) },
    { icon: MapPin, label: "Código postal", value: shown(user.postalCode) },
    { icon: MapPin, label: "Coordenadas", value: coordinates },
    {
      icon: CircleCheck,
      label: "Ubicación en mapa",
      value: user.addressPlaceId ? "Validada" : "Sin validar",
    },
  ];
  const contact = [
    { icon: Phone, label: "Teléfono", value: user.phone },
    {
      icon: Contact,
      label: "Contacto de emergencia",
      value: shown(user.emergencyContactName),
    },
    {
      icon: Phone,
      label: "Teléfono de emergencia",
      value: shown(user.emergencyContactPhone),
    },
    {
      icon: HeartPulse,
      label: "Cobertura médica",
      value: shown(user.medicalCoverage),
    },
    {
      icon: IdCard,
      label: "Número de afiliado",
      value: shown(user.affiliateNumber),
    },
  ];
  const groups = {
    "personal-data": {
      title: "Datos personales",
      description: "Identidad y datos personales registrados.",
      icon: UserRound,
      rows: personal,
    },
    "system-access": {
      title: "Acceso al sistema",
      description: "Cuenta, rol y estado administrativo.",
      icon: ShieldCheck,
      rows: access,
    },
    address: {
      title: "Domicilio",
      description: "Ubicación declarada y referencia geográfica.",
      icon: MapPin,
      rows: address,
    },
    contact: {
      title: "Contacto y cobertura",
      description: "Teléfonos, emergencia y cobertura médica.",
      icon: HeartPulse,
      rows: contact,
    },
  };
  const group = groups[section];
  return (
    <>
      <AdminRecordSectionContent
        title={group.title}
        description={group.description}
        icon={group.icon}
      >
        <dl className="grid gap-3 md:grid-cols-2">
          {group.rows.map((row) => (
            <CatalogDetailField
              key={row.label}
              icon={row.icon}
              label={row.label}
            >
              {row.value}
            </CatalogDetailField>
          ))}
        </dl>
      </AdminRecordSectionContent>
      {section === "personal-data" ? (
        <AdminRecordSectionContent
          className="mt-8 border-t border-[var(--brand-border)] pt-8"
          title="Imágenes personales"
          description="Fotografías asociadas al ciudadano."
          icon={FileCheck2}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <RecordImage label="Avatar" src={user.avatarUrl} />
            <RecordImage
              label="Foto de identidad"
              src={user.identityPhotoUrl ?? null}
            />
          </div>
        </AdminRecordSectionContent>
      ) : null}
      {section === "personal-data" &&
      user.role.toLowerCase().includes("profesor") ? (
        <AdminRecordSectionContent
          className="mt-8 border-t border-[var(--brand-border)] pt-8"
          title="Perfil docente"
          description="Información profesional vinculada al rol."
          icon={Contact}
        >
          <dl className="grid gap-3 md:grid-cols-2">
            <CatalogDetailField icon={Contact} label="Especialidad">
              {shown(user.professorSpecialty)}
            </CatalogDetailField>
            <CatalogDetailField icon={IdCard} label="Matrícula">
              {shown(user.professorLicense)}
            </CatalogDetailField>
            <CatalogDetailField icon={Info} label="Descripción">
              {shown(user.professorDescription)}
            </CatalogDetailField>
          </dl>
        </AdminRecordSectionContent>
      ) : null}
    </>
  );
}

function RecordImage({ label, src }: { label: string; src: string | null }) {
  return (
    <div>
      <p className="mb-2 text-sm font-extrabold text-[var(--brand-primary)]">
        {label}
      </p>
      <div className="grid aspect-[4/3] max-w-sm place-items-center overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-panel)]">
        {src ? (
          <Image src={src} alt={label} className="size-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-[var(--brand-muted)]">
            Sin imagen registrada
          </span>
        )}
      </div>
    </div>
  );
}

function RecordCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <AdminRecordSectionContent
      title={title}
      description={description}
      icon={Info}
    >
      {children}
    </AdminRecordSectionContent>
  );
}

function ParticipationSection({
  user,
  onSaved,
}: {
  user: ManagedUser;
  onSaved: () => Promise<void>;
}) {
  const [status, setStatus] = useState(
    user.participationStatus ?? "HABILITADO",
  );
  const [justified, setJustified] = useState(
    user.justifiedAbsenceThreshold?.toString() ?? "",
  );
  const [unjustified, setUnjustified] = useState(
    user.unjustifiedAbsenceThreshold?.toString() ?? "",
  );
  const [observations, setObservations] = useState(
    user.participationObservations ?? "",
  );
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await axiosInstance.patch(`/users/${user.id}/participation`, {
        status,
        justifiedAbsenceThreshold: justified ? Number(justified) : null,
        unjustifiedAbsenceThreshold: unjustified ? Number(unjustified) : null,
        observations: observations.trim() || null,
      });
      await onSaved();
      toast.success("Política de participación actualizada.");
    } catch {
      toast.error("No pudimos actualizar la participación.");
    } finally {
      setSaving(false);
    }
  }
  const participationEnabled = status === "HABILITADO";
  return (
    <RecordCard
      title="Participación"
      description="Control administrativo de ausencias y habilitación del ciudadano."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Ausencias justificadas</Label>
          <div className="relative">
            <CircleCheck className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--brand-primary)]" />
            <Input
              type="number"
              min={1}
              value={justified}
              onChange={(event) => setJustified(event.target.value)}
              className="h-11 rounded-xl border-[var(--brand-border)] bg-white pl-10 shadow-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Ausencias injustificadas</Label>
          <div className="relative">
            <CircleX className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--brand-primary)]" />
            <Input
              type="number"
              min={1}
              value={unjustified}
              onChange={(event) => setUnjustified(event.target.value)}
              className="h-11 rounded-xl border-[var(--brand-border)] bg-white pl-10 shadow-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Estado de participación</Label>
          <div className="flex h-11 items-center justify-between rounded-xl border border-[var(--brand-border)] bg-white px-4 shadow-sm">
            <span className="text-sm font-bold text-[var(--brand-primary)]">
              {participationEnabled
                ? "Activa"
                : status === "EN_REVISION"
                  ? "En revisión"
                  : "Inactiva"}
            </span>
            <Switch
              checked={participationEnabled}
              onCheckedChange={(checked) =>
                setStatus(checked ? "HABILITADO" : "SUSPENDIDO_PROVISORIO")
              }
              aria-label="Activar o desactivar participación"
            />
          </div>
        </div>
        <div className="space-y-2 lg:col-span-3">
          <Label>Observaciones administrativas</Label>
          <div className="relative">
            <MessageSquareText className="pointer-events-none absolute left-3 top-3 z-10 size-4 text-[var(--brand-primary)]" />
            <Textarea
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              rows={5}
              className="resize-none rounded-xl border-[var(--brand-border)] bg-white pl-10 shadow-sm"
              placeholder="Agregá información relevante sobre la participación del ciudadano..."
            />
          </div>
        </div>
      </div>
      <Separator className="my-6 bg-[var(--brand-border)]" />
      <Button
        disabled={saving}
        className="h-12 rounded-xl bg-[var(--brand-primary)] px-7 text-base font-bold text-white hover:bg-[var(--brand-primary-hover)]"
        onClick={() => void save()}
      >
        {saving ? <Loader2 className="animate-spin" /> : <Save />}Guardar
        política
      </Button>
    </RecordCard>
  );
}
