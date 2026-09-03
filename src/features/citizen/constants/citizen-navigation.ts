import {
  BellRing,
  CalendarDays,
  ClipboardCheck,
  Files,
  Home,
  LibraryBig,
  ListChecks,
  QrCode,
  UserRound,
} from "lucide-react";

export const CITIZEN_NAVIGATION = [
  { section: "General", href: "/citizen", label: "Inicio", icon: Home },
  { section: "Actividades", href: "/citizen/activities", label: "Actividades", icon: LibraryBig },
  { section: "Actividades", href: "/citizen/enrollments", label: "Mis inscripciones", icon: ClipboardCheck },
  { section: "Actividades", href: "/citizen/schedule", label: "Próximas clases", icon: CalendarDays },
  { section: "Actividades", href: "/citizen/attendance", label: "Asistencias", icon: ListChecks },
  { section: "Mi cuenta", href: "/citizen/qr", label: "Mi QR", icon: QrCode },
  { section: "Mi cuenta", href: "/citizen/documents", label: "Mis documentos", icon: Files },
  { section: "Comunicación", href: "/citizen/notifications", label: "Notificaciones", icon: BellRing },
  { section: "Mi cuenta", href: "/citizen/profile", label: "Mi perfil", icon: UserRound },
] as const;

export function isCitizenPathActive(pathname: string, href: string) {
  return href === "/citizen"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}
