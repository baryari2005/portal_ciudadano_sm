export type NotificationType =
  | "SOLICITUD_ACCESO_CREADA"
  | "SOLICITUD_ACCESO_APROBADA"
  | "SOLICITUD_ACCESO_RECHAZADA"
  | "INSCRIPCION_CONFIRMADA"
  | "LISTA_ESPERA"
  | "PROMOCION_LISTA_ESPERA"
  | "INSCRIPCION_CANCELADA"
  | "INSCRIPCION_RECHAZADA"
  | "INSCRIPCION_BAJA"
  | "CLASE_MODIFICADA"
  | "CLASE_SUSPENDIDA"
  | "CLASE_CANCELADA"
  | "DOCUMENTO_APROBADO"
  | "DOCUMENTO_RECHAZADO"
  | "QR_EMITIDO"
  | "QR_REVOCADO"
  | "GENERAL";
export type NotificationStatus = "NO_LEIDA" | "LEIDA" | "ARCHIVADA" | "ENVIADA";
export type NotificationPriority = "BAJA" | "NORMAL" | "ALTA";
export type Notification = {
  id: string;
  notificationId?: string;
  userId?: string;
  senderId?: string | null;
  audience?: "INDIVIDUAL" | "MASIVA" | "ROL";
  deliveryOrigin?: "INDIVIDUAL" | "MASIVA" | "ROL";
  managementStatus?: "INFORMATIVA" | "ABIERTA" | "EN_TRATAMIENTO" | "RESUELTA" | "CANCELADA";
  recipientCount?: number;
  recipients?: Array<{ id: string; firstName: string | null; lastName: string | null }>;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  actionUrl: string | null;
  actionLabel: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  user?: { id: string; firstName: string | null; lastName: string | null };
  sender?: { id: string; firstName: string | null; lastName: string | null } | null;
  role?: { id: number; codigo?: string; nombre?: string } | null;
};
