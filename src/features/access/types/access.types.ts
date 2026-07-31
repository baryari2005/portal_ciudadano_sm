export type AccessResult = "PERMITIDO" | "RECHAZADO";
export type AccessOrigin = "QR" | "QR_DIGITAL" | "CARNET_FISICO" | "MANUAL";
export type AccessReason =
  | "USUARIO_HABILITADO" | "QR_INVALIDO" | "QR_REVOCADO" | "USUARIO_INACTIVO"
  | "QR_USADO" | "USUARIO_ELIMINADO" | "SIN_INSCRIPCION" | "INSCRIPCION_NO_CONFIRMADA"
  | "SIN_CLASE_HABILITADA" | "FUERA_DE_HORARIO" | "CLASE_SUSPENDIDA"
  | "CLASE_CANCELADA" | "ESTABLECIMIENTO_INCORRECTO"
  | "ACCESO_MANUAL_AUTORIZADO" | "ACCESO_MANUAL_RECHAZADO";

export type AccessPerson = { id: string; nombre: string | null; apellido: string | null; dni: string; email?: string; estado?: string; avatarUrl: string | null; profilePhotoUrl: string | null };
export type AccessSession = { id: string; activityName: string; startTime: string; endTime: string };
export type AccessEvaluation = { allowed: boolean; result: AccessResult; reason: AccessReason; message: string; matchedSession?: AccessSession; matchedEnrollmentId?: string };
export type AccessValidationResponse = AccessEvaluation & { accessRecordId: string; occurredAt: string; user?: AccessPerson };
export type QrScannerStatus = "idle" | "scanning" | "read" | "searching" | "found" | "invalid" | "camera-not-supported" | "camera-not-found" | "camera-permission-denied" | "camera-in-use" | "barcode-unsupported" | "barcode-error" | "scanner-error";
export type QrParseResult = { type: "dni"; value: string } | { type: "invalid"; value: null };
