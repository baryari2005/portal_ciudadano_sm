"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";
import { draftFingerprint } from "../helpers/draft-persistence";
import { saveDraftClient } from "../services/activity-drafts.service";
import type { ActivityDraft, ActivityDraftPayload } from "../types/activity-draft.types";

type Options = {
  draft: ActivityDraft | null;
  payload: ActivityDraftPayload | null;
  step: number;
  paused: boolean;
  onSaved: (draft: ActivityDraft) => void;
};

export function useActivityDraftAutosave(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const saved = useRef<ActivityDraft | null>(options.draft);
  if (options.draft && (!saved.current || saved.current.id !== options.draft.id)) saved.current = options.draft;
  const pending = useRef<Promise<ActivityDraft> | null>(null);
  const stopped = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const conflictRef = useRef(false);
  const failedSnapshot = useRef<string | null>(null);

  const dirty = Boolean(options.draft && options.payload && draftFingerprint(options.payload) !== draftFingerprint(options.draft.payload));

  const flush = useCallback(async (targetStep?: number): Promise<ActivityDraft> => {
    // Serialize autosaves and explicit saves; each write uses the last acknowledged version.
    while (pending.current) await pending.current;
    if (conflictRef.current) throw new Error("El borrador cambió en otra sesión. Recargá la edición para continuar.");
    const current = latest.current;
    const version = saved.current;
    if (!version || !current.payload) throw new Error("El borrador todavía no está disponible.");
    if (draftFingerprint(current.payload) === draftFingerprint(version.payload)) return version;
    const snapshot = current.payload;
    setSaving(true);
    setError(null);
    const request = saveDraftClient(version.id, snapshot, targetStep ?? current.step, version.updatedAt);
    pending.current = request;
    try {
      const result = await request;
      saved.current = result;
      failedSnapshot.current = null;
      current.onSaved(result);
      return result;
    } catch (requestError) {
      const isConflict = axios.isAxiosError(requestError) && [404, 409].includes(requestError.response?.status ?? 0);
      conflictRef.current = isConflict;
      setConflict(isConflict);
      failedSnapshot.current = draftFingerprint(snapshot);
      const message = `No se guardaron los últimos cambios. ${getAxiosMessage(requestError, "Tus cambios siguen en esta pantalla. Reintentá antes de salir.")}`;
      setError(message);
      throw new Error(message);
    } finally {
      if (pending.current === request) pending.current = null;
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (!dirty || options.paused || saving || conflict || stopped.current) return;
    if (error && options.payload && draftFingerprint(options.payload) === failedSnapshot.current) return;
    const timer = window.setTimeout(() => { if (!stopped.current) void flush().catch(() => undefined); }, 900);
    return () => window.clearTimeout(timer);
  }, [dirty, options.payload, options.paused, saving, error, conflict, flush]);

  const stop = useCallback(async () => {
    stopped.current = true;
    await pending.current?.catch(() => undefined);
    return saved.current;
  }, []);
  const resume = useCallback(() => { stopped.current = false; }, []);

  return { dirty, saving, error, conflict, flush, stop, resume };
}
