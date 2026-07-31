import type { LoginDraft } from "@/features/auth/types/login.types";

export const STORAGE_KEY = "loginFormDraft";
export const ERROR_KEY = "loginFormError";

function canUseSessionStorage() {
  return (
    typeof window !== "undefined" &&
    typeof window.sessionStorage !== "undefined"
  );
}

export function readDraft(fallback: LoginDraft = {}): LoginDraft {
  if (!canUseSessionStorage()) {
    return fallback;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<LoginDraft> | null;

    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }

    return {
      userId:
        typeof parsed.userId === "string" ? parsed.userId : fallback.userId,
    };
  } catch {
    return fallback;
  }
}

export function writeDraft(vals: LoginDraft) {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        userId: typeof vals.userId === "string" ? vals.userId : "",
      }),
    );
  } catch {}
}

export function clearDraft() {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function readTopError(): string | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    return sessionStorage.getItem(ERROR_KEY);
  } catch {
    return null;
  }
}

export function writeTopError(message: string) {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    sessionStorage.setItem(ERROR_KEY, message);
  } catch {}
}

export function clearTopError() {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    sessionStorage.removeItem(ERROR_KEY);
  } catch {}
}
