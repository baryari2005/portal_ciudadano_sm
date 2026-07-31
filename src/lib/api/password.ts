import { axiosInstance } from "@/lib/axios";

export async function requestPasswordReset(payload: {
  email?: string;
  userId?: string;
}) {
  const { data } = await axiosInstance.post("/auth/password/forgot", payload, {
    skipAuthRedirect: true, // público
  });
  return data as { ok: true };
}

export async function resetPassword(payload: {
  token: string;
  newPassword: string;
}) {
  const { data } = await axiosInstance.post("/auth/password/reset", payload, {
    skipAuthRedirect: true,
  });
  return data as { ok: true };
}

export async function verifyResetToken(token: string) {
  const { data } = await axiosInstance.get("/auth/password/verify", {
    params: { token },
    skipAuthRedirect: true,
  });
  return data as { valid: boolean };
}
