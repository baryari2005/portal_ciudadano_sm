"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Contact, FileCheck2, HeartPulse, IdCard, Images, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import { AdminRecordLayout, AdminRecordSectionContent } from "@/components/shared/admin-record-layout";
import { CatalogDetailField } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { AddressMapView } from "@/features/geocoding/components/AddressMapView";
import { splitExactAddress } from "@/features/geocoding/helpers/exact-address";
import type { ManagedUser } from "@/features/users/types/management.types";
import { getTeacherCitizenRecordClient } from "../services/teacher.service";
import { useTeacherCitizenDocuments } from "../hooks/useTeacherCitizenDocuments";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { TeacherEnrolleeDocuments } from "./TeacherEnrolleeDocuments";

export const TEACHER_CITIZEN_RECORD_SECTIONS = ["personal-data", "address", "contact", "images", "documents"] as const;
export type TeacherCitizenRecordSection = typeof TEACHER_CITIZEN_RECORD_SECTIONS[number];
const sections = [{ id: "personal-data", label: "Datos personales", icon: UserRound }, { id: "address", label: "Domicilio", icon: MapPin }, { id: "contact", label: "Contacto y cobertura", icon: HeartPulse }, { id: "images", label: "Imágenes", icon: Images }, { id: "documents", label: "Documentos", icon: FileCheck2 }] as const;

export function TeacherCitizenRecordPage({ citizenId, section }: { citizenId: string; section: TeacherCitizenRecordSection }) {
  const searchParams = useSearchParams(), enrollmentId = searchParams.get("enrollmentId") ?? "", [activeSection, setActiveSection] = useState(section), [user, setUser] = useState<ManagedUser | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(false);
  const { isLoading: documentsLoading } = useTeacherCitizenDocuments(activeSection === "documents" ? citizenId : null);
  const load = useCallback(async () => { setLoading(true); setError(false); try { setUser(await getTeacherCitizenRecordClient(citizenId)); } catch { setError(true); } finally { setLoading(false); } }, [citizenId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setActiveSection(section); }, [section]);
  function selectSection(next: TeacherCitizenRecordSection) { if (next === activeSection) return; const query = enrollmentId ? `?enrollmentId=${encodeURIComponent(enrollmentId)}` : ""; window.history.pushState(null, "", `/teacher/enrollees/${citizenId}/record/${next}${query}`); setActiveSection(next); }
  if (loading || documentsLoading) return <CatalogLoadingState label="información del inscripto" fullPage />;
  return <AdminRecordLayout title="Ficha completa del inscripto" description={user ? `Información de ${user.fullName} · DNI ${user.dni}` : "Información integral del ciudadano inscripto"} icon={UserRound} backHref="/teacher/enrollees" sections={sections} activeSection={activeSection} onSectionChange={selectSection} navigationDisabled={loading} loading={loading} loadingLabel="información del inscripto">{error || (!loading && !user) ? <p>No pudimos cargar la ficha del inscripto.</p> : null}{user ? <RecordContent user={user} section={activeSection}/> : null}</AdminRecordLayout>;
}

function RecordContent({ user, section }: { user: ManagedUser; section: TeacherCitizenRecordSection }) {
  if (section === "images") return <AdminRecordSectionContent title="Imágenes personales" description="Fotografías asociadas al ciudadano." icon={Images}><div className="grid content-start gap-5 sm:grid-cols-2"><RecordImage label="Avatar" src={user.avatarUrl}/><RecordImage label="Foto de identidad" src={user.identityPhotoUrl ?? null}/></div></AdminRecordSectionContent>;
  if (section === "documents") return <AdminRecordSectionContent title="Documentos del inscripto" description="Consultá la documentación personal presentada por el ciudadano." icon={FileCheck2}><TeacherEnrolleeDocuments citizenId={user.id}/></AdminRecordSectionContent>;
  const shown = (value?: string | null) => value || "Sin registrar", exact = splitExactAddress(user.address === "Sin registrar" ? "" : user.address);
  const groups = {
    "personal-data": { title: "Datos personales", description: "Identidad y datos personales registrados.", icon: UserRound, rows: [{ icon: UserRound, label: "Nombre completo", value: user.fullName }, { icon: UserRound, label: "Usuario", value: user.userId }, { icon: Mail, label: "Email", value: user.email }, { icon: IdCard, label: "Tipo y número de documento", value: `${shown(user.documentType)} · ${user.dni}` }, { icon: IdCard, label: "CUIL", value: shown(user.cuil) }, { icon: CalendarDays, label: "Fecha de nacimiento", value: user.birthDate }, { icon: UserRound, label: "Género", value: shown(user.gender) }, { icon: Contact, label: "Estado civil", value: shown(user.maritalStatus) }, { icon: ShieldCheck, label: "Nacionalidad", value: shown(user.nationality) }] },
    address: { title: "Domicilio", description: "Ubicación declarada y referencia geográfica.", icon: MapPin, rows: [{ icon: MapPin, label: "Calle", value: shown(exact.street) }, { icon: IdCard, label: "Altura", value: shown(exact.number) }, { icon: Contact, label: "Piso, departamento, casa o referencia", value: shown(exact.complement) }, { icon: MapPin, label: "Dirección completa", value: user.address }, { icon: MapPin, label: "Localidad", value: shown(user.locality) }, { icon: MapPin, label: "Provincia", value: shown(user.province) }, { icon: MapPin, label: "Código postal", value: shown(user.postalCode) }] },
    contact: { title: "Contacto y cobertura", description: "Teléfonos, emergencia y cobertura médica.", icon: HeartPulse, rows: [{ icon: Phone, label: "Teléfono", value: user.phone }, { icon: Contact, label: "Contacto de emergencia", value: shown(user.emergencyContactName) }, { icon: Phone, label: "Teléfono de emergencia", value: shown(user.emergencyContactPhone) }, { icon: HeartPulse, label: "Cobertura médica", value: shown(user.medicalCoverage) }, { icon: IdCard, label: "Número de afiliado", value: shown(user.affiliateNumber) }] },
  };
  const group = groups[section];
  return <AdminRecordSectionContent title={group.title} description={group.description} icon={group.icon}><div className={section === "address" ? "grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)] lg:items-stretch" : undefined}><dl className="grid content-start gap-3 md:grid-cols-2">{group.rows.map((row) => <CatalogDetailField key={row.label} icon={row.icon} label={row.label}>{row.value}</CatalogDetailField>)}</dl>{section === "address" ? <div className="min-w-0"><p className="mb-2 text-sm font-extrabold text-[var(--brand-primary)]">Ubicación del domicilio</p><AddressMapView lat={user.addressLat} lng={user.addressLng} label={`Domicilio de ${user.fullName}`}/></div> : null}</div></AdminRecordSectionContent>;
}

function RecordImage({ label, src }: { label: string; src: string | null }) { return <div><p className="mb-2 text-sm font-extrabold text-[var(--brand-primary)]">{label}</p><div className="relative grid aspect-[4/3] w-full max-w-48 place-items-center overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-panel)]">{src ? <Image src={src} alt={label} fill sizes="192px" className="object-cover"/> : <span className="px-3 text-center text-sm font-bold text-[var(--brand-muted)]">Sin imagen registrada</span>}</div></div>; }
