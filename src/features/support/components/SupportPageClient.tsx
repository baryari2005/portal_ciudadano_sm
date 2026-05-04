"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  FileSearch2,
  FileSignature,
  Headset,
  Settings2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/stores/auth";
import { getVisibleHelpGuides } from "../lib/visible-help-guides";
import { type HelpGuide } from "../lib/help-guides";
import { SupportAssistant } from "./SupportAssistant";

const categoryMeta = {
  solicitudes: {
    label: "Solicitudes",
    icon: ClipboardList,
    description: "Vacaciones y licencias paso a paso.",
  },
  documentos: {
    label: "Documentos",
    icon: FileSignature,
    description: "Recibos, firmas y seguimiento.",
  },
  gestion: {
    label: "Gestion",
    icon: Settings2,
    description: "Usuarios, catalogos y administracion.",
  },
} as const;

function GuideCard({ guide }: { guide: HelpGuide }) {
  return (
    <Card className="h-full border border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">{guide.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{guide.description}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          {guide.steps.map((step, index) => (
            <div key={`${guide.id}-${index}`} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#008C93]/10 text-xs font-semibold text-[#008C93]">
                {index + 1}
              </div>
              <p className="text-sm leading-6 text-slate-700">{step}</p>
            </div>
          ))}
        </div>

        {guide.href ? (
          <Link href={guide.href}>
            <Button className="h-10 rounded bg-[#008C93] hover:bg-[#007381]">
              {guide.ctaLabel ?? "Abrir seccion"}
            </Button>
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SupportPageClient() {
  const permissions = useAuth((state) => state.user?.permisos ?? []);

  const visibleGuides = useMemo(() => {
    return getVisibleHelpGuides(permissions);
  }, [permissions]);

  const groupedGuides = useMemo(() => {
    return {
      solicitudes: visibleGuides.filter((guide) => guide.category === "solicitudes"),
      documentos: visibleGuides.filter((guide) => guide.category === "documentos"),
      gestion: visibleGuides.filter((guide) => guide.category === "gestion"),
    };
  }, [visibleGuides]);

  const featuredRequestGuides = useMemo(() => {
    return visibleGuides.filter((guide) =>
      ["load-vacation-request", "load-license-request", "review-request-history"].includes(
        guide.id
      )
    );
  }, [visibleGuides]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#008C93] via-[#007381] to-[#0f172a] text-white shadow-lg">
        <CardContent className="grid gap-6 px-6 py-8 md:grid-cols-[1.5fr_1fr] md:px-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide">
              <Headset className="h-3.5 w-3.5" />
              Centro de ayuda
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold">Como hacer cada tarea dentro del sistema</h1>
              <p className="max-w-2xl text-sm leading-6 text-white/85">
                Aca tenes guias cortas para las acciones mas comunes: cargar solicitudes,
                pedir vacaciones, ver documentos, revisar recibos o administrar
                configuraciones.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="h-4 w-4" />
              Recomendacion
            </div>
            <p className="text-sm leading-6 text-white/85">
              Si estas arrancando, empieza por las guias de Solicitudes o Documentos.
              Son las mas usadas y te van a orientar rapido dentro de cada pantalla.
            </p>
          </div>
        </CardContent>
      </Card>

      {featuredRequestGuides.length > 0 ? (
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ClipboardList className="h-5 w-5 text-[#008C93]" />
              Acciones frecuentes para cargar solicitudes
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Esta seccion resume las tareas mas comunes para pedir vacaciones, licencias
              y revisar el historial desde el mismo lugar.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-3">
              {featuredRequestGuides.map((guide) => (
                <div
                  key={guide.id}
                  className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-900">{guide.title}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {guide.description}
                    </p>
                  </div>

                  {guide.href ? (
                    <Link href={guide.href} className="mt-4">
                      <Button
                        variant="outline"
                        className="w-full justify-between border-[#008C93]/25 bg-white text-[#008C93] hover:bg-[#008C93]/5 hover:text-[#007381]"
                      >
                        {guide.ctaLabel ?? "Abrir seccion"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <SupportAssistant />

      <Tabs defaultValue="solicitudes" className="space-y-4">
        <TabsList className="grid h-11 w-full grid-cols-3">
          <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="gestion">Gestion</TabsTrigger>
        </TabsList>

        {(["solicitudes", "documentos", "gestion"] as const).map((category) => {
          const meta = categoryMeta[category];
          const Icon = meta.icon;
          const guides = groupedGuides[category];

          return (
            <TabsContent key={category} value={category} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Icon className="h-5 w-5 text-[#008C93]" />
                    {meta.label}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{meta.description}</p>
                </CardHeader>
              </Card>

              {guides.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-sm text-muted-foreground">
                    No hay guias visibles para esta categoria con tus permisos actuales.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {guides.map((guide) => (
                    <GuideCard key={guide.id} guide={guide} />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileSearch2 className="h-5 w-5 text-[#008C93]" />
            No encuentras lo que necesitas?
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            Podemos seguir ampliando esta ayuda con mas guias, tours guiados por pantalla
            o incluso un asistente paso a paso segun el modulo.
          </p>
          <Link href="/">
            <Button variant="outline" className="h-10 rounded">
              Volver al inicio
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
