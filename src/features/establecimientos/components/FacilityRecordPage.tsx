"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CalendarClock,
  Clock3,
  Info,
  LibraryBig,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import { AdminRecordLayout, AdminRecordSectionContent } from "@/components/shared/admin-record-layout";
import { ActivityScheduleSummary } from "@/features/activity-schedules/components/ActivityScheduleSummary";
import { CatalogDetailField } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { getEstablecimientoClient } from "../services/establecimientos.service";
import type { Establecimiento } from "../types/establecimiento.types";

const sections = [
  { id: "overview", label: "Resumen", icon: Info },
  { id: "opening-hours", label: "Horarios de apertura", icon: Clock3 },
  { id: "activities", label: "Actividades", icon: LibraryBig },
  { id: "schedules", label: "Actividades y horarios", icon: CalendarClock },
] as const;
export type FacilityRecordSection = (typeof sections)[number]["id"];

export function FacilityRecordPage({
  facilityId,
  section,
}: {
  facilityId: string;
  section: FacilityRecordSection;
}) {
  const [facility, setFacility] = useState<Establecimiento | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(section);
  const [sectionLoading, setSectionLoading] = useState(section === "schedules");

  useEffect(() => {
    void getEstablecimientoClient(facilityId)
      .then(setFacility)
      .finally(() => setLoading(false));
  }, [facilityId]);

  function select(next: FacilityRecordSection) {
    if (next === active) return;
    setSectionLoading(next === "schedules");
    window.history.pushState(null, "", `/facilities/${facilityId}/record/${next}`);
    setActive(next);
  }

  return (
    <AdminRecordLayout
      title="Ficha completa del establecimiento"
      description={
        facility
          ? `${facility.nombre} · ${facility.direccion}`
          : "Información integral del establecimiento"
      }
      icon={Building2}
      backHref="/facilities"
      sections={sections}
      activeSection={active}
      onSectionChange={select}
      navigationDisabled={loading}
      loading={loading || sectionLoading}
      loadingLabel="información del establecimiento"
    >
      {facility ? (
        <FacilitySection
          facility={facility}
          section={active}
          onLoadingChange={setSectionLoading}
        />
      ) : loading ? null : (
        <p>No pudimos cargar el establecimiento.</p>
      )}
    </AdminRecordLayout>
  );
}

function FacilitySection({
  facility,
  section,
  onLoadingChange,
}: {
  facility: Establecimiento;
  section: FacilityRecordSection;
  onLoadingChange: (loading: boolean) => void;
}) {
  if (section === "schedules") {
    return (
      <>
        <Section title="Actividades y horarios"><ActivityScheduleSummary
          establishmentId={facility.id}
          title="Horarios programados"
          onLoadingChange={onLoadingChange}
        /></Section>
      </>
    );
  }
  if (section === "opening-hours") {
    return (
      <>
        <Section title="Horarios de apertura"><div className="grid gap-3">
          {facility.horarios.map((item) => (
            <CatalogDetailField key={item.id ?? item.diaSemana} icon={Clock3} label={item.diaSemana}>
              {item.cerrado ? "Cerrado" : `${item.horaApertura} a ${item.horaCierre}`}
            </CatalogDetailField>
          ))}
          {!facility.horarios.length ? <p>Sin horarios cargados.</p> : null}
        </div></Section>
      </>
    );
  }
  if (section === "activities") {
    return (
      <>
        <Section title="Actividades asociadas"><div className="grid gap-3">
          {facility.actividades.map((item) => (
            <CatalogDetailField key={item.id} icon={LibraryBig} label={item.nombre}>
              {item.estadoTexto || "Actividad asociada"}
            </CatalogDetailField>
          ))}
          {!facility.actividades.length ? <p>Sin actividades asociadas.</p> : null}
        </div></Section>
      </>
    );
  }
  return (
    <>
      <Section title="Resumen"><dl className="grid gap-3">
        <CatalogDetailField icon={MapPin} label="Dirección">{facility.direccion}</CatalogDetailField>
        <CatalogDetailField icon={MapPin} label="Barrio">{facility.barrio || "Sin registrar"}</CatalogDetailField>
        <CatalogDetailField icon={Mail} label="Email">{facility.email || "Sin registrar"}</CatalogDetailField>
        <CatalogDetailField icon={Phone} label="Teléfono">{facility.telefono || "Sin registrar"}</CatalogDetailField>
        <CatalogDetailField icon={Info} label="Observaciones">{facility.observacion || "Sin observaciones"}</CatalogDetailField>
      </dl></Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const config = (
    {
      Resumen: [Info, "Consultá los datos principales y de contacto del establecimiento."],
      "Horarios de apertura": [Clock3, "Revisá los días y franjas en que el establecimiento permanece abierto."],
      "Actividades asociadas": [LibraryBig, "Consultá las actividades actualmente vinculadas con este establecimiento."],
      "Actividades y horarios": [CalendarClock, "Visualizá la programación de actividades sin modificarla desde esta ficha."],
    } as const
  )[title] ?? [Info, "Consultá la información de esta sección."];
  return <AdminRecordSectionContent title={title} icon={config[0]} description={config[1]}>{children}</AdminRecordSectionContent>;
}
