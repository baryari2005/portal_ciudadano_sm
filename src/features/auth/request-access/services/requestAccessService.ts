import type {
  RequestAccessPayload,
  RequestAccessResponse,
} from "../types/requestAccess.types";
import { getStoredToken } from "@/features/auth/libs/auth-session";

export async function submitRequestAccess(
  payload: RequestAccessPayload,
): Promise<RequestAccessResponse> {
  const token = getStoredToken();
  const response = await fetch("/api/auth/request-access", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = (await response
    .json()
    .catch(() => null)) as Partial<RequestAccessResponse> | null;

  if (!response.ok) {
    throw new Error(data?.message || "No pudimos enviar la solicitud.");
  }

  return {
    ok: Boolean(data?.ok),
    message: data?.message || "Solicitud enviada correctamente",
  };
}
