"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAuth } from "@/stores/auth";
import { messages } from "@/utils/messages";
import {
  clearDraft,
  clearTopError,
  readDraft,
  readTopError,
  writeDraft,
  writeTopError,
} from "@/features/auth/libs/login-storage";
import { loginSchema } from "../schemas/schemas";

export type Values = z.infer<typeof loginSchema>;

export function useLogin() {
  const { login, triedMe, token, user, loading, hasHydrated, fetchMe } =
    useAuth();

  const [mounted, setMounted] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const netSubmittingRef = useRef(false);

  const form = useForm<Values>({
    resolver: zodResolver(loginSchema),
    defaultValues: { userId: "", password: "" },
    mode: "onChange",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    setMounted(true);

    const draft = readDraft({});
    form.reset({
      userId: draft.userId ?? "",
      password: "",
    });

    const err = readTopError();
    if (err) {
      setAuthError(err);
    }
  }, [form]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const sub = form.watch((vals, info) => {
      if (!info.name || info.name === "userId") {
        writeDraft({
          userId: vals.userId ?? "",
        });
      }
    });

    return () => sub.unsubscribe();
  }, [form, mounted]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!token || user || triedMe || loading) {
      return;
    }

    void fetchMe();
  }, [hasHydrated, token, user, triedMe, loading, fetchMe]);

  const dismissTopError = () => {
    setAuthError(null);
    clearTopError();
    form.clearErrors();
  };

  const topError = useMemo(() => {
    if (!mounted) {
      return null;
    }

    if (authError) {
      return authError;
    }

    if (!form.formState.isSubmitted) {
      return null;
    }

    const { errors } = form.formState;

    if (errors.userId?.message && errors.password?.message) {
      return messages.errors.loginError;
    }

    return errors.userId?.message || errors.password?.message || null;
  }, [mounted, authError, form.formState]);

  const onSubmit = async (values: Values) => {
    if (netSubmittingRef.current) {
      return;
    }

    netSubmittingRef.current = true;
    setAuthError(null);
    clearTopError();

    try {
      const result = await login({
        userId: values.userId,
        password: values.password,
      });

      if (!result.ok) {
        const message = result.message || messages.errors.loginError;
        setAuthError(message);
        writeTopError(message);
        return;
      }

      clearDraft();
      clearTopError();
      form.reset({
        userId: "",
        password: "",
      });
    } finally {
      netSubmittingRef.current = false;
    }
  };

  return {
    form,
    onSubmit,
    topError,
    dismissTopError,
    netSubmittingRef,
    triedMe,
    token,
    user,
    loading,
    hasHydrated,
  };
}
