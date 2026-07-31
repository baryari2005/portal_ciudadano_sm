"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  ClipboardCheck,
  FileCheck2,
  Info,
  ListChecks,
  UsersRound,
} from "lucide-react";

import { AdminRecordLayout, AdminRecordSectionContent } from "@/components/shared/admin-record-layout";
import { CatalogDetailField } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { ActivityScheduleSummary } from "@/features/activity-schedules/components/ActivityScheduleSummary";
import { ActivitySessionSummary } from "@/features/activity-sessions/components/ActivitySessionSummary";
import { EnrollmentSummary } from "@/features/enrollments/components/EnrollmentSummary";
import { getActividadClient } from "../services/actividades.service";
import type { Actividad } from "../types/actividad.types";

const sections = [
  { id: "overview", label: "Resumen", icon: Info },
  { id: "schedules", label: "Programación", icon: CalendarClock },
  { id: "sessions", label: "Clases", icon: ClipboardCheck },
  { id: "enrollments", label: "Inscripciones", icon: UsersRound },
  { id: "requirements", label: "Requisitos", icon: FileCheck2 },
] as const;
type Section = (typeof sections)[number]["id"];

export function ActivityRecordPage({
  activityId,
  section,
}: {
  activityId: string;
  section: Section;
}) {
  const [activity, setActivity] = useState<Actividad | null>(null);
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(
    ["schedules", "sessions", "enrollments"].includes(section),
  );
  const [active, setActive] = useState<Section>(section);

  useEffect(() => {
    void getActividadClient(activityId)
      .then(setActivity)
      .finally(() => setLoading(false));
  }, [activityId]);

  function select(next: Section) {
    if (next === active) return;
    setSectionLoading(["schedules", "sessions", "enrollments"].includes(next));
    window.history.pushState(null, "", `/activities/${activityId}/record/${next}`);
    setActive(next);
  }

  return (
    <AdminRecordLayout
      title="Ficha completa de la actividad"
      description={
        activity
          ? `Información integral de ${activity.nombre} · ${activity.establecimiento.nombre}`
          : "Consultá la información integral de la actividad."
      }
      icon={ListChecks}
      backHref="/activities"
      sections={sections}
      activeSection={active}
      onSectionChange={select}
      navigationDisabled={loading}
      loading={loading || sectionLoading}
      loadingLabel="información de la actividad"
    >
      {activity ? (
        <RecordContent
          activity={activity}
          section={active}
          onLoadingChange={setSectionLoading}
        />
      ) : loading ? null : (
        <p>No pudimos cargar la actividad.</p>
      )}
    </AdminRecordLayout>
  );
}

function RecordContent({
  activity,
  section,
  onLoadingChange,
}: {
  activity: Actividad;
  section: Section;
  onLoadingChange: (loading: boolean) => void;
}) {
  if (section === "schedules") {
    return <Section title="Programación"><ActivityScheduleSummary activityId={activity.id} onLoadingChange={onLoadingChange} showActions={false} contentOnly /></Section>;
  }
  if (section === "sessions") {
    return <Section title="Clases programadas"><ActivitySessionSummary activityId={activity.id} embedded onLoadingChange={onLoadingChange} /></Section>;
  }
  if (section === "enrollments") {
    return <Section title="Inscripciones"><EnrollmentSummary activityId={activity.id} embedded onLoadingChange={onLoadingChange} /></Section>;
  }
  if (section === "requirements") {
    return <Section title="Requisitos"><div className="grid gap-3">{activity.requirements.map((item) => <CatalogDetailField key={item.id} icon={FileCheck2} label={item.name}>{item.mandatory ? "Obligatorio" : "Opcional"}</CatalogDetailField>)}{!activity.requirements.length ? <p>No hay requisitos configurados.</p> : null}</div></Section>;
  }
  return <Section title="Resumen"><dl className="grid gap-3"><CatalogDetailField icon={Info} label="Descripción">{activity.descripcion || activity.descripcionCorta || "Sin descripción"}</CatalogDetailField><CatalogDetailField icon={CalendarClock} label="Modalidad">{activity.modalidadOperacion}</CatalogDetailField><CatalogDetailField icon={UsersRound} label="Dirigido a">{activity.publicosObjetivo.map((item) => item.nombre).join(", ") || "Sin definir"}</CatalogDetailField><CatalogDetailField icon={Info} label="Estado">{activity.estado}</CatalogDetailField></dl></Section>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const config = ({
    Resumen: [Info, "Consultá la configuración principal de la actividad."],
    Programación: [CalendarClock, "Revisá los días, horarios y establecimientos programados desde la actividad."],
    "Clases programadas": [ClipboardCheck, "Consultá las próximas clases generadas para esta actividad."],
    Inscripciones: [UsersRound, "Visualizá las personas inscriptas y la disponibilidad de cupos."],
    Requisitos: [FileCheck2, "Consultá la documentación y condiciones requeridas para participar."],
  } as const)[title] ?? [Info, "Consultá la información de esta sección."];
  return <AdminRecordSectionContent title={title} icon={config[0]} description={config[1]}>{children}</AdminRecordSectionContent>;
}
