import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import { TEACHER_SESSION_ACCESS_DENIED_MESSAGE } from "@/features/teacher/constants/teacher-errors";

declare module "axios" {
  export interface AxiosRequestConfig {
    skipAuthRedirect?: boolean;
    showTeacherAssignmentError?: boolean;
  }
}

const baseURL = "/api";

export const axiosInstance = axios.create({
  baseURL,
});

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;

  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }

  if (token) {
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common.Authorization;
  }
}

if (typeof window !== "undefined") {
  const token = localStorage.getItem("token");
  if (token) {
    setAuthToken(token);
  }
}

type AxiosRequestConfigExt = AxiosRequestConfig & {
  skipAuthRedirect?: boolean;
  showTeacherAssignmentError?: boolean;
};

function isLoginCall(url = "") {
  try {
    const parsedUrl = url.startsWith("http")
      ? new URL(url)
      : new URL(url, "http://x");

    return parsedUrl.pathname.endsWith("/auth/login");
  } catch {
    return url.endsWith("/auth/login");
  }
}

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token =
    inMemoryToken ??
    (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization =
      `Bearer ${token}`;
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const config = (error.config ?? {}) as AxiosRequestConfigExt;
    const requestUrl = config.url ?? "";

    if (config.skipAuthRedirect) {
      return Promise.reject(error);
    }

    if (typeof window !== "undefined") {
      const isOnLogin = window.location.pathname === "/login";
      const loginCall = isLoginCall(requestUrl);

      if (status === 401 && !isOnLogin && !loginCall) {
        setAuthToken(null);

        const currentPath = window.location.pathname + window.location.search;
        const next = encodeURIComponent(currentPath);

        window.location.replace(`/login?next=${next}`);

        return new Promise<never>(() => {});
      }

      if (status === 403 && config.showTeacherAssignmentError) {
        const data = error.response?.data as { message?: string } | undefined;
        if (data?.message === TEACHER_SESSION_ACCESS_DENIED_MESSAGE) {
          toast.error(data.message, { id: `teacher-assignment:${requestUrl}` });
        }
      }
    }

    return Promise.reject(error);
  },
);
