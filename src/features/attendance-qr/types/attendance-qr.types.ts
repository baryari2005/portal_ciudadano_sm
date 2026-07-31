export type QrCredentialStatus = "ACTIVO" | "REVOCADO";
export type UserQrCredentialSummary = { status: QrCredentialStatus | "SIN_EMITIR"; issuedAt: string | null; lastUsedAt: string | null; token?: string | null };
export type IssueQrCredentialResponse = { token: string; credential: UserQrCredentialSummary };
export type AttendanceQrResultCode = "REGISTERED" | "ALREADY_REGISTERED" | "INVALID_QR" | "REVOKED_QR" | "USER_NOT_FOUND" | "USER_DISABLED" | "NOT_ENROLLED" | "ENROLLMENT_NOT_CONFIRMED" | "SESSION_NOT_AVAILABLE" | "ATTENDANCE_CLOSED" | "OUTSIDE_TIME_WINDOW" | "EXISTING_DIFFERENT_STATUS";
export type AttendanceQrResult = { result: AttendanceQrResultCode; message: string; attendance?: { id: string; status: string; origin: string; registeredAt: string | null }; user?: { id: string; firstName: string | null; lastName: string | null; documentNumber: string | null; avatarUrl: string | null }; enrollment?: { id: string; status: string } };
