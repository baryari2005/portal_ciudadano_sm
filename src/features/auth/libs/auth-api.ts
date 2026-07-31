import { axiosInstance } from "@/lib/axios";
import type {
  AuthLoginResponse,
  AuthMeResponse,
  LoginBody,
} from "@/features/auth/types/auth.types";

export async function getMe() {
  const { data } = await axiosInstance.get<AuthMeResponse>("/auth/me", {
    skipAuthRedirect: true,
  });

  return data;
}

export async function postLogin(body: LoginBody) {
  const { data } = await axiosInstance.post<AuthLoginResponse>(
    "/auth/login",
    body,
    {
      skipAuthRedirect: true,
    },
  );

  return data;
}
