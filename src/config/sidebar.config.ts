import {
  Home,
  FileSignature,
  Sunrise,
  ClipboardList,
  ShieldCheck,
  Users,
  LibraryBig,
  School,
  Shapes,
  UsersRound,
  GraduationCap,
  ClipboardCheck,
  CalendarDays,
  ListChecks,
  FileCheck2,
  Files,
  BellRing,
  History,
  ChartNoAxesCombined,
  DoorOpen,
  HeartPulse,
  Boxes,
  DatabaseZap,
  BriefcaseBusiness,
  Settings2,
  QrCode,
  UserPlus,
  UserRound,
} from "lucide-react";
import { ComponentType, SVGProps } from "react";

type SidebarIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type SidebarItemConfig = {
  section: string;
  title: string;
  href: string;
  icon: SidebarIcon;
  permission?: { modulo: string; accion: string };
  badgeKey?: string;
};

export const SIDEBAR_CONFIG: SidebarItemConfig[] = [
  {
    section: "Administración",
    title: "Parámetros generales",
    href: "/general-settings",
    icon: Settings2,
    permission: { modulo: "general_settings", accion: "ver" },
  },
  {
    section: "Inicio",
    title: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    section: "Ciudadanos",
    title: "Ciudadanos",
    href: "/users",
    icon: Users,
    permission: { modulo: "usuarios", accion: "ver" },
  },
  {
    section: "Ciudadanos",
    title: "Documentos",
    href: "/user-documents",
    icon: Files,
    permission: { modulo: "enrollment_documents", accion: "ver" },
  },
  {
    section: "Personal",
    title: "Personal",
    href: "/personnel",
    icon: BriefcaseBusiness,
    permission: { modulo: "usuarios", accion: "ver" },
  },
  {
    section: "Administración",
    title: "Roles y Permisos",
    href: "/roles",
    icon: ShieldCheck,
    permission: { modulo: "roles", accion: "ver" },
  },
  {
    section: "Catálogos y Configuración",
    title: "Obras sociales y prepagas",
    href: "/medical-coverages",
    icon: HeartPulse,
    permission: { modulo: "usuarios", accion: "ver" },
  },
  {
    section: "Catálogos y Configuración",
    title: "Recursos físicos",
    href: "/resources",
    icon: Boxes,
    permission: { modulo: "resources", accion: "ver" },
  },
  {
    section: "Catálogos y Configuración",
    title: "Categorías de actividades",
    href: "/activity-categories",
    icon: Shapes,
    permission: { modulo: "categorias_actividades", accion: "ver" },
  },
  {
    section: "Catálogos y Configuración",
    title: "Dirigido a..",
    href: "/target-audiences",
    icon: UsersRound,
    permission: { modulo: "publicos_objetivo", accion: "ver" },
  },
  {
    section: "Catálogos y Configuración",
    title: "Requisitos",
    href: "/requirements",
    icon: FileCheck2,
    permission: { modulo: "requirements", accion: "ver" },
  },
  
  {
    section: "Recepción",
    title: "Control de ingreso",
    href: "/access",
    icon: DoorOpen,
    permission: { modulo: "access", accion: "ver" },
  },
  {
    section: "Personal",
    title: "Establecimientos",
    href: "/facilities",
    icon: School,
    permission: { modulo: "establecimientos", accion: "ver" },
  },
  {
    section: "Actividades y Programación",
    title: "Actividades",
    href: "/activities",
    icon: LibraryBig,
    permission: { modulo: "actividades", accion: "ver" },
  },
  {
    section: "Participación",
    title: "Inscripciones",
    href: "/enrollments",
    icon: ClipboardCheck,
    permission: { modulo: "enrollments", accion: "ver" },
  },
  {
    section: "Administración",
    title: "Auditoría",
    href: "/audit-log",
    icon: History,
    permission: { modulo: "audit_log", accion: "ver" },
  },
  {
    section: "Administración",
    title: "Reportes",
    href: "/reports",
    icon: ChartNoAxesCombined,
    permission: { modulo: "reports", accion: "ver" },
  },
  {
    section: "Administración",
    title: "Datos de prueba",
    href: "/system/data-reset",
    icon: DatabaseZap,
    permission: { modulo: "system", accion: "reset_database" },
  },
  {
    section: "Actividades y Programación",
    title: "Clases",
    href: "/activity-sessions",
    icon: CalendarDays,
    permission: { modulo: "activity_sessions", accion: "ver" },
  },
  {
    section: "Participación",
    title: "Asistencias",
    href: "/attendance",
    icon: ListChecks,
    permission: { modulo: "attendance", accion: "ver" },
  },
  // {
  //   section: "Personal",
  //   title: "Profesores",
  //   href: "/teachers",
  //   icon: GraduationCap,
  //   permission: { modulo: "profesores", accion: "ver" },
  // },
  
  // {
    //     section: "Gestion Recibos y Vacaciones",
    //     title: "Subir PDF de recibos",
    //     href: "/admin/docs",
    //     icon: FileUp,
    //     permission: { modulo: "recibos", accion: "subir" },
    // },
    // {
  //     section: "Gestion Recibos y Vacaciones",
  //     title: "Seguimiento Recibos",
  //     href: "/payroll/receipts",
  //     icon: FileSearch2,
  //     permission: { modulo: "recibos", accion: "seguimiento" },
  // },
  // {
    //     section: "Gestion Recibos y Vacaciones",
  //     title: "Balance Vacaciones",
  //     href: "/vacation-balance",
  //     icon: CalendarDays,
  //     permission: { modulo: "vacaciones", accion: "asignar" },
  // },
  // {
    //     section: "Gestion de Licencias",
    //     title: "Tipos de licencias",
    //     href: "/leave-types",
    //     icon: CalendarCog,
    //     permission: { modulo: "tipo_licencia", accion: "ver" },
    // },
  // {
    //     section: "Aprobaciones",
  //     title: "Vacaciones",
  //     href: "/admin/vacations",
  //     icon: Sunrise,
  //     permission: { modulo: "vacaciones", accion: "ver" },
  //     badgeKey: "pendingVacation",
  // },
  // {
    //     section: "Aprobaciones",
    //     title: "Licencias",
    //     href: "/admin/licenses",
    //     icon: ClipboardList,
    //     permission: { modulo: "licencias", accion: "ver" },
    //     badgeKey: "pendingLicenses",
    // },
    {
      section: "Comunicación",
      title: "Notificaciones",
      href: "/notifications",
      icon: BellRing,
      badgeKey: "notifications",
    },
  ];

export const RECEPTION_SIDEBAR_CONFIG: SidebarItemConfig[] = [
  { section: "General", title: "Inicio", href: "/reception", icon: Home, permission: { modulo: "access", accion: "ver" } },
  { section: "Participación", title: "Inscripciones", href: "/reception/enrollments", icon: ClipboardCheck, permission: { modulo: "enrollments", accion: "ver" } },
  { section: "Recepción", title: "Escanear QR", href: "/reception/scan", icon: DoorOpen, permission: { modulo: "access", accion: "crear" } },
  { section: "Recepción", title: "Búsqueda manual", href: "/reception/manual", icon: Users, permission: { modulo: "access", accion: "crear" } },
  { section: "Recepción", title: "Adjuntar documentos", href: "/reception/documents/new", icon: Files, permission: { modulo: "enrollment_documents", accion: "editar" } },
  { section: "Recepción", title: "Solicitar acceso", href: "/reception/citizens", icon: UserPlus, permission: { modulo: "usuarios", accion: "ver" } },
  { section: "Recepción", title: "Historial", href: "/reception/history", icon: History, permission: { modulo: "access", accion: "ver" } },
  { section: "Mi cuenta", title: "Mi perfil", href: "/reception/profile", icon: UserRound },
  { section: "Mi cuenta", title: "Mi QR", href: "/reception/qr", icon: QrCode },
  { section: "Comunicación", title: "Notificaciones", href: "/reception/notifications", icon: BellRing, badgeKey: "notifications" },
];
  
