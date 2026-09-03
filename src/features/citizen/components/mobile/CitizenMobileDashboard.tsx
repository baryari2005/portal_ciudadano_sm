"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Files,
  LibraryBig,
  MapPin,
  Cloud,
  CloudRain,
  Sun,
  Zap,
} from "lucide-react";

import { ActivityImagePreview } from "@/features/actividades/components/ActivityImagePreview";
import { UserAvatar } from "@/components/layout/user-menu/UserAvatar";
import { useAuth } from "@/stores/auth";
import type { DashboardData } from "../CitizenDashboard";

const quickActions = [
  { href: "/citizen/activities", label: "Mis actividades", icon: LibraryBig },
  { href: "/citizen/schedule", label: "Próximas clases", icon: CalendarClock },
  { href: "/citizen/documents", label: "Mis documentos", icon: Files },
  { href: "/citizen/notifications", label: "Novedades", icon: Bell },
  { href: "/citizen/help", label: "Centro de ayuda", icon: CircleHelp },
] as const;

export function CitizenMobileDashboard({ data }: { data: DashboardData }) {
  const user = useAuth((state) => state.user);
  const fullName = [user?.nombre, user?.apellido].filter(Boolean).join(" ") || user?.userId || "Ciudadano";
  const firstName = data.user.firstName || user?.nombre || "Ciudadano";
  const attentionCount = data.documentation.observedEnrollments + data.documentation.pendingEnrollments;
  const news = data.notifications.latest.slice(0, 3);

  return (
    <div className="space-y-6 bg-[var(--brand-page)] pb-5 lg:hidden">
      <section className="flex items-center gap-4 px-4 py-5">
        <UserAvatar
          src={user?.avatarUrl ?? undefined}
          name={fullName}
          className="size-16 shrink-0 rounded-full border-2 border-white shadow-md ring-1 ring-[var(--brand-border-soft)]"
          imageClassName="size-full rounded-full object-cover"
          fallbackBgClass="rounded-full bg-[var(--brand-panel)]"
          textClass="text-lg font-extrabold text-[var(--brand-primary)]"
        />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold text-[var(--brand-primary)]">Hola, {firstName}</h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Bienvenido al Portal Ciudadano</p>
        </div>
        <WeatherBadge />
      </section>

      <section className="grid grid-cols-3 gap-2 px-4">
        <MobileMetric icon={CalendarClock} label="Próximas clases" value={data.counts.upcomingSessions} href="/citizen/schedule" />
        <MobileMetric icon={ClipboardCheck} label="Pendientes" value={attentionCount} href="/citizen/documents" />
        <MobileMetric icon={Bell} label="Notificaciones" value={data.notifications.unreadCount} href="/citizen/notifications" />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between px-4">
          <h2 className="flex items-center gap-2 font-extrabold text-[var(--brand-primary)]"><Zap className="size-5 fill-current" />Acciones rápidas</h2>
          <Link href="/citizen/activities" className="flex items-center text-sm font-bold text-[var(--brand-secondary)]">Ver todas <ChevronRight className="size-4" /></Link>
        </div>
        <div className="grid grid-cols-5 gap-2 px-4">
          {quickActions.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex min-h-24 min-w-0 flex-col items-center justify-center rounded-2xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] px-1.5 py-2 text-center text-[9px] font-bold leading-3 text-[var(--brand-ink)] shadow-sm">
              <span className="mb-2 grid size-8 place-items-center text-[var(--brand-primary)]"><Icon className="size-6" /></span>
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 items-stretch gap-3 px-4">
        <article className="relative min-h-[268px] overflow-hidden rounded-3xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-3 shadow-sm">
          <div aria-hidden className="absolute bottom-12 right-[-28px] size-40 rounded-full bg-[#DCEFD5]/75" />
          <div aria-hidden className="absolute bottom-5 right-20 size-24 rounded-full bg-[#CDE7C5]/60" />
          {data.nextSession?.activity.imageUrl ? <ActivityImagePreview source={data.nextSession.activity.imageUrl} alt={`Imagen de ${data.nextSession.activity.name}`} className="absolute bottom-10 right-0 z-[1] h-[56%] w-[44%] mix-blend-multiply !rounded-none !border-0 !bg-transparent !object-contain object-bottom" /> : <div aria-hidden className="absolute bottom-14 right-5 z-[1] grid size-24 place-items-center rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"><LibraryBig className="size-10" /></div>}
          <div className="relative z-10 max-w-[66%]">
          <div className="flex flex-wrap items-center gap-1.5"><p className="inline-flex rounded-md bg-[#E8F4E5] px-2 py-1 text-[10px] font-extrabold uppercase text-[var(--brand-primary)]">Próxima actividad</p>{data.nextSession ? <ActivityCountdown date={data.nextSession.date} startTime={data.nextSession.startTime} /> : null}</div>
          {data.nextSession ? <>
            <h2 className="mt-3 text-lg font-extrabold leading-5 text-[var(--brand-primary)]">{data.nextSession.activity.name}</h2>
            <div className="mt-3 space-y-2 text-[11px] leading-4 text-[var(--brand-text)]">
              <p className="flex items-center gap-2"><CalendarClock className="size-4" />{data.nextSession.date} · {data.nextSession.startTime}</p>
              <p className="flex items-center gap-2"><MapPin className="size-4" />{data.nextSession.establishment.name}</p>
            </div>
            <Link href="/citizen/schedule" className="mt-4 inline-flex h-9 items-center gap-1 rounded-xl border border-[var(--brand-primary)] px-3 text-[11px] font-bold text-[var(--brand-primary)]">Ver detalles <ChevronRight className="size-3.5" /></Link>
          </> : <>
            <h2 className="mt-4 text-lg font-extrabold text-[var(--brand-primary)]">Explorá nuevas actividades</h2>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">Todavía no tenés clases próximas.</p>
            <Link href="/citizen/activities" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--brand-primary)] px-4 text-sm font-bold text-[var(--brand-primary)]">Ver actividades <ChevronRight className="size-4" /></Link>
          </>}
          </div>
        </article>

        <article className="rounded-3xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-extrabold text-[var(--brand-primary)]">Notificaciones</h2><span className="grid min-w-6 place-items-center rounded-full bg-[var(--brand-primary)] px-1.5 py-1 text-[10px] font-bold text-white">{data.notifications.unreadCount}</span></div>
          <div className="mt-3 divide-y divide-[var(--brand-border-soft)]">
            {news.length ? news.map((item) => <Link key={item.id} href={item.actionUrl || "/citizen/notifications"} className="flex gap-2 py-2.5"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--brand-panel)] text-[var(--brand-primary)]"><CheckCircle2 className="size-3.5" /></span><span className="min-w-0"><span className="block truncate text-[11px] font-bold text-[var(--brand-ink)]">{item.title}</span><span className="line-clamp-2 text-[10px] leading-3 text-[var(--brand-muted)]">{item.message}</span></span></Link>) : <p className="py-5 text-center text-xs text-[var(--brand-muted)]">No tenés novedades recientes.</p>}
          </div>
          <Link href="/citizen/notifications" className="mt-2 flex items-center justify-between text-xs font-bold text-[var(--brand-primary)]">Ver todas <ChevronRight className="size-4" /></Link>
        </article>
      </section>

      <Link href="/citizen/qr" className="mx-4 grid min-h-[104px] grid-cols-[104px_minmax(0,1fr)_94px] items-center overflow-hidden rounded-3xl bg-gradient-to-r from-[#0A5135] to-[#087044] pr-3 text-white shadow-sm">
        <Image src="/mobile/credencial.png" alt="Credencial digital" width={382} height={271} className="h-[100px] w-[108px] self-end object-contain object-bottom" />
        <span className="min-w-0 py-3 pr-2"><strong className="block text-sm font-extrabold leading-4">Tu credencial digital</strong><span className="mt-1 block text-[11px] leading-4 text-white/80">Accedé a servicios y actividades presentando tu QR.</span></span>
        <span className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#E5F5D4] px-3 text-center text-xs font-bold text-[var(--brand-primary)]">Ver mi QR</span>
      </Link>
    </div>
  );
}

type WeatherData = { temperature: number; weatherCode: number; isDay: boolean; location: string };

function ActivityCountdown({ date, startTime }: { date: string; startTime: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const today = new Date(now);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (date !== todayKey) return null;
  const startsAt = new Date(`${date}T${startTime.length === 5 ? `${startTime}:00` : startTime}`).getTime();
  const remainingMinutes = Math.ceil((startsAt - now) / 60_000);
  if (!Number.isFinite(startsAt) || remainingMinutes <= 0) return null;
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  return <span className="text-[9px] font-bold text-[var(--brand-secondary)]">Dentro de {hours ? `${hours}h ` : ""}{minutes}m</span>;
}

function WeatherBadge() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const load = async (url: string) => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) return false;
        setWeather(await response.json() as WeatherData);
        return true;
      } catch {
        return false;
      }
    };
    const fallback = () => void load("/api/public/weather");

    if (!navigator.geolocation) {
      fallback();
      return () => controller.abort();
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const params = new URLSearchParams({
          latitude: coords.latitude.toFixed(4),
          longitude: coords.longitude.toFixed(4),
        });
        void load(`/api/public/weather?${params}`).then((loaded) => {
          if (!loaded && !controller.signal.aborted) fallback();
        });
      },
      fallback,
      { enableHighAccuracy: false, timeout: 5_000, maximumAge: 15 * 60 * 1_000 },
    );
    return () => controller.abort();
  }, []);
  if (!weather) return null;
  const WeatherIcon = weather.weatherCode >= 51 ? CloudRain : weather.weatherCode >= 1 ? Cloud : Sun;
  return <div className="ml-auto flex shrink-0 items-center gap-2 rounded-2xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] px-3 py-2 shadow-sm"><WeatherIcon className={`size-6 ${weather.weatherCode >= 51 ? "text-blue-600" : "text-amber-500"}`} /><span><strong className="block text-lg leading-5 text-[var(--brand-ink)]">{weather.temperature}°</strong><span className="text-[10px] text-[var(--brand-muted)]">{weather.location}</span></span></div>;
}

function MobileMetric({ icon: Icon, label, value, href }: { icon: typeof CalendarClock; label: string; value: number; href: string }) {
  return <Link href={href} className="flex min-h-[96px] min-w-0 flex-col rounded-2xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-2.5 shadow-[0_8px_20px_rgba(29,79,54,0.12)]"><span className="block text-[13px] font-extrabold leading-[14px] text-[var(--brand-ink)]">{label}</span><span className="mt-1.5 flex items-end justify-between gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-panel)] text-[var(--brand-primary)]"><Icon className="size-5" /></span><strong className="text-3xl leading-none text-[var(--brand-primary)]">{value}</strong></span></Link>;
}
