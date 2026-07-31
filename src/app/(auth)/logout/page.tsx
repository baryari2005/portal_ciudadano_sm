// src/app/(auth)/logout/page.tsx
"use client";
import { useEffect } from "react";
import { useAuth } from "@/stores/auth";

export default function Logout() {
  const { logout } = useAuth();
  useEffect(() => {
    logout();
  }, [logout]);
  return null;
}
