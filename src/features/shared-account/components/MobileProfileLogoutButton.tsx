"use client";

import { useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/stores/auth";

export function MobileProfileLogoutButton() {
  const logout = useAuth(state => state.logout);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);

  function handleLogout() {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    logout();
  }

  return <Button data-mobile-profile-logout="" type="button" variant="outline" disabled={closing} aria-busy={closing} onClick={handleLogout} className="h-12 min-h-11 w-full rounded-2xl border-red-200 bg-white font-bold text-red-700 hover:bg-red-50 hover:text-red-800">
    <LogOut className="size-5"/>Cerrar sesión
  </Button>;
}
