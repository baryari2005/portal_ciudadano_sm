"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const IDLE_TIME_MS = 10 * 60 * 1000; // 10 minutos sin actividad
const COUNTDOWN_SECONDS = 15; // segundos del modal

export function useIdleLogout(onLogout: () => void) {
  // ✅ SIEMPRE con valor inicial
  const [showModal, setShowModal] = useState<boolean>(false);
  const [seconds, setSeconds] = useState<number>(COUNTDOWN_SECONDS);

  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }

    idleTimeoutRef.current = setTimeout(() => {
      setSeconds(COUNTDOWN_SECONDS);
      setShowModal(true);
    }, IDLE_TIME_MS);
  }, []);

  const logoutNow = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    onLogout();
  }, [onLogout]);

  const continueSession = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowModal(false);
    resetIdleTimer();
  }, [resetIdleTimer]);

  // ⏳ countdown del modal
  useEffect(() => {
    if (!showModal) return;

    countdownRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          logoutNow();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [showModal, logoutNow]);

  // 👂 eventos de actividad
  useEffect(() => {
    resetIdleTimer();

    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer));

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [resetIdleTimer]);

  return {
    showModal,
    seconds,
    continueSession,
    logoutNow,
  };
}
