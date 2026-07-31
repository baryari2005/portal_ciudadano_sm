"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getMe, postLogin } from "@/features/auth/libs/auth-api";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "@/features/auth/libs/auth-session";
import type {
  LoginBody,
  LoginResult,
  UserDTO,
} from "@/features/auth/types/auth.types";

type State = {
  user: UserDTO | null;
  token: string | null;
  loading: boolean;
  triedMe: boolean;
  hasHydrated: boolean;
};

type Actions = {
  setToken: (token: string | null) => void;
  setUser: (user: UserDTO | null) => void;
  setHasHydrated: (value: boolean) => void;
  fetchMe: (force?: boolean) => Promise<void>;
  login: (body: LoginBody) => Promise<LoginResult>;
  logout: (redirectTo?: string) => void;
};

let mePromise: Promise<void> | null = null;
let mePromiseToken: string | null = null;

function getApiErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "error" in error.response.data &&
    typeof error.response.data.error === "string"
  ) {
    return error.response.data.error;
  }

  return "No pudimos iniciar sesión.";
}

export const useAuth = create<State & Actions>()(
  persist(
    (set, get) => ({
      user: null,
      token: typeof window !== "undefined" ? getStoredToken() : null,
      loading: false,
      triedMe: false,
      hasHydrated: false,

      setToken: (token) => {
        setStoredToken(token);

        set((state) => ({
          token,
          user: token ? state.user : null,
          triedMe: token ? state.triedMe : true,
        }));
      },

      setUser: (user) => {
        set({ user });
      },

      setHasHydrated: (value) => {
        set({ hasHydrated: value });
      },

      fetchMe: async (force = false) => {
        const { token, triedMe, user, loading } = get();

        if (!token) {
          set({
            user: null,
            token: null,
            loading: false,
            triedMe: true,
          });
          return;
        }

        if (!force && triedMe && !!user) {
          return;
        }

        if (!force && loading && mePromise) {
          return mePromise;
        }

        if (!force && mePromise && mePromiseToken === token) {
          return mePromise;
        }

        set({ loading: true });
        mePromiseToken = token;

        mePromise = getMe()
          .then((data) => {
            set({
              user: data.user ?? null,
              loading: false,
              triedMe: true,
            });
          })
          .catch(() => {
            clearStoredToken();
            set({
              user: null,
              token: null,
              loading: false,
              triedMe: true,
            });
          })
          .finally(() => {
            mePromise = null;
            mePromiseToken = null;
          });

        return mePromise;
      },

      login: async (body) => {
        set({ loading: true });

        try {
          const data = await postLogin(body);
          const token = data.token ?? data.accessToken ?? null;

          if (!token) {
            set({
              user: null,
              token: null,
              loading: false,
              triedMe: true,
            });
            return { ok: false, message: data.error };
          }

          get().setToken(token);
          await get().fetchMe(true);

          const user = get().user;

          if (!user) {
            set({ loading: false });
            return { ok: false };
          }

          if (user.mustChangePassword) {
            set({ loading: false });

            if (typeof window !== "undefined") {
              window.location.replace("/change-password?first=1");
            }

            return { ok: true };
          }

          if (data.redirectTo) {
            set({ loading: false });

            if (typeof window !== "undefined") {
              window.location.replace(data.redirectTo);
            }

            return { ok: true };
          }

          set({ loading: false });
          return { ok: true };
        } catch (error) {
          clearStoredToken();
          set({
            user: null,
            token: null,
            loading: false,
            triedMe: true,
          });
          return { ok: false, message: getApiErrorMessage(error) };
        }
      },

      logout: (redirectTo = "/login") => {
        clearStoredToken();
        set({
          user: null,
          token: null,
          loading: false,
          triedMe: true,
        });

        if (typeof window !== "undefined") {
          window.location.replace(redirectTo);
        }
      },
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!state) {
          return;
        }

        const token = error ? null : getStoredToken();
        setStoredToken(token);
        state.setToken(token);
        state.setHasHydrated(true);

        if (!token) {
          state.setUser(null);
        }
      },
    },
  ),
);
