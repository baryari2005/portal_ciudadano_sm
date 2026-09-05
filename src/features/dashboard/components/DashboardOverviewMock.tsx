"use client";

import {
  ArrowUp,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  FileText,
  UserRound,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const summaryStats = [
  {
    label: "Actividades",
    value: "42",
    change: "18%",
    icon: CalendarDays,
  },
  {
    label: "Inscripciones",
    value: "356",
    change: "12%",
    icon: UserRound,
  },
  {
    label: "Cupos",
    value: "184",
    change: "8%",
    icon: UsersRound,
  },
  {
    label: "Establecimientos",
    value: "18",
    change: "5%",
    icon: Building2,
  },
] as const;

const registrationsByDay = [
  { day: "18/05", value: 42 },
  { day: "19/05", value: 61 },
  { day: "20/05", value: 50 },
  { day: "21/05", value: 79 },
  { day: "22/05", value: 60 },
  { day: "23/05", value: 75 },
  { day: "24/05", value: 100 },
] as const;

const recentActivity = [
  {
    time: "10:24",
    person: "Maria Gomez",
    action: "Inscripcion",
    detail: "Apoyo escolar",
    tone: "green",
  },
  {
    time: "10:11",
    person: "Luis Perez",
    action: "Edicion",
    detail: "Taller de oficio",
    tone: "yellow",
  },
  {
    time: "09:48",
    person: "Ana Ruiz",
    action: "Creacion",
    detail: "Deporte juvenil",
    tone: "blue",
  },
  {
    time: "09:21",
    person: "Roberto Diaz",
    action: "Inscripcion",
    detail: "Operativo salud",
    tone: "green",
  },
  {
    time: "08:57",
    person: "Carla Ruiz",
    action: "Edicion",
    detail: "Cultura barrial",
    tone: "yellow",
  },
] as const;

const badgeToneClass: Record<string, string> = {
  blue: "border-blue-200 bg-blue-100 text-primary",
  green: "border-[#cfe5b8] bg-[#dceecb] text-primary",
  yellow: "border-amber-200 bg-amber-100 text-primary",
};

export function DashboardOverviewMock() {
  return (
    <div className="mx-auto grid w-full max-w-[1500px] gap-6">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-normal text-primary md:text-4xl">
            Dashboard general
          </h1>
        </div>

        <div className="flex items-center gap-3 rounded-lg px-2 py-1 text-primary">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-accent)]">
            <CalendarDays className="h-6 w-6" />
          </span>
          <span className="text-xl font-bold leading-5">
            24 de mayo
            <br />
            de 2026
          </span>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card
              key={stat.label}
              className="rounded-lg border-0 bg-white/90 py-0 shadow-sm"
            >
              <CardContent className="flex items-center gap-5 px-6 py-6">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
                  <Icon className="h-8 w-8" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-primary">{stat.label}</p>
                  <p className="text-4xl font-extrabold leading-none text-primary">
                    {stat.value}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-sm">
                    <ArrowUp className="h-4 w-4 text-[#9ccb14]" />
                    <span className="font-bold text-[#9ccb14]">
                      {stat.change}
                    </span>
                    <span className="text-muted-foreground">vs. ayer</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-lg border-0 bg-white/90 py-0 shadow-sm">
          <CardContent className="px-7 py-6">
            <h2 className="text-xl font-extrabold text-primary">
              Inscripciones por dia
            </h2>

            <div className="mt-8 grid min-h-[230px] grid-cols-[32px_1fr] gap-4">
              <div className="grid h-full grid-rows-5 text-xs font-bold text-primary/80">
                {[100, 75, 50, 25, 0].map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>

              <div className="relative">
                <div className="absolute inset-0 grid grid-rows-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="border-t border-dashed border-[#d7ddd3]"
                    />
                  ))}
                </div>

                <div className="relative z-10 grid h-full grid-cols-7 items-end gap-6">
                  {registrationsByDay.map((item) => (
                    <div
                      key={item.day}
                      className="flex h-full flex-col items-center justify-end gap-3"
                    >
                      <div className="flex h-[190px] w-full items-end justify-center">
                        <div
                          className={`w-7 rounded-t-md ${
                            item.value === 100 ? "bg-primary" : "bg-[#b5d80d]"
                          }`}
                          style={{ height: `${item.value}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-foreground/80">
                        {item.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-0 border-l-2 border-l-[#b5d80d] bg-white/90 py-0 shadow-sm">
          <CardContent className="px-7 py-6">
            <h2 className="text-xl font-extrabold text-primary">
              Actividad reciente
            </h2>

            <div className="mt-4 overflow-hidden">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#d7ddd3] text-left text-xs font-extrabold text-foreground/55">
                    <th className="w-[16%] py-3">HORA</th>
                    <th className="w-[25%] py-3">PERSONA</th>
                    <th className="w-[26%] py-3">ACTIVIDAD</th>
                    <th className="py-3">DETALLE</th>
                    <th className="w-8 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((item) => (
                    <tr
                      key={`${item.time}-${item.person}`}
                      className="border-b border-[#e1e5de] text-foreground/80"
                    >
                      <td className="py-3 font-bold">{item.time}</td>
                      <td className="py-3 font-semibold">{item.person}</td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={badgeToneClass[item.tone]}
                        >
                          {item.action}
                        </Badge>
                      </td>
                      <td className="truncate py-3 font-semibold">
                        {item.detail}
                      </td>
                      <td className="py-3 text-right">
                        <ChevronRight className="ml-auto h-5 w-5 text-primary" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              className="mt-5 ml-auto flex items-center gap-2 text-sm font-extrabold text-primary hover:text-primary/85"
            >
              Ver todas las actividades
              <ChevronRight className="h-5 w-5" />
            </button>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-lg border-0 bg-white/90 py-0 shadow-sm">
        <CardContent className="grid gap-6 px-7 py-6 lg:grid-cols-[1fr_auto_360px] lg:items-center">
          <div className="flex items-center gap-5">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-accent)] text-primary">
              <BarChart3 className="h-9 w-9" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-primary">
                Resumen del dia
              </h2>
              <p className="mt-1 max-w-xl text-sm font-medium text-foreground/80">
                Hoy se han registrado{" "}
                <span className="font-extrabold text-primary">56</span>{" "}
                inscripciones y se han actualizado{" "}
                <span className="font-extrabold text-primary">12</span>{" "}
                actividades.
              </p>
            </div>
          </div>

          <div className="hidden h-16 w-px bg-[#d7ddd3] lg:block" />

          <Button className="h-14 justify-center rounded-lg bg-primary px-8 text-base font-bold text-white hover:bg-primary/95">
            <FileText className="h-5 w-5" />
            Ver reporte completo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
