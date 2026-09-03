"use client";

import { useState } from "react";
import { useAuth } from "@/stores/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, LockKeyhole, Mail, Image as ImageIcon } from "lucide-react";
import { UserMenuTriggerButton } from "./UserMenuTriggerButton";
import { UserMenuHeader } from "./UserMenuHeader";
import { MenuItemWithSubtitle } from "./MenuItemWithSubtitle";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { ChangeEmailDialog } from "./ChangeEmailDialog";
import { ChangeAvatarDialog } from "./ChangeAvatarDialog";

export function UserMenu() {
  const user = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);

  const [openPwd, setOpenPwd] = useState(false);
  const [openEmail, setOpenEmail] = useState(false);
  const [openAvatar, setOpenAvatar] = useState(false);

  const fullName =
    [user?.nombre, user?.apellido].filter(Boolean).join(" ") ||
    user?.userId ||
    "Usuario";

  const email = user?.email || "";
  const avatarUrl = user?.avatarUrl ?? undefined;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <UserMenuTriggerButton avatarUrl={avatarUrl} fullName={fullName} />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-72 overflow-hidden rounded-2xl border border-[#DDE5D8] bg-white p-0 text-[#1D4F36] shadow-[0_18px_45px_rgba(0,58,34,0.16)]"
        >
          <UserMenuHeader
            avatarUrl={avatarUrl}
            fullName={fullName}
            email={email}
          />

          <DropdownMenuSeparator className="mx-3 my-1 bg-[#E4E9E3]" />

          <MenuItemWithSubtitle
            icon={LockKeyhole}
            title="Editar contraseña"
            subtitle="Cambiar clave de acceso"
            onClick={() => setOpenPwd(true)}
          />
          <MenuItemWithSubtitle
            icon={Mail}
            title="Editar email"
            subtitle="Cambiar email personal"
            onClick={() => setOpenEmail(true)}
          />
          <MenuItemWithSubtitle
            icon={ImageIcon}
            title="Editar avatar"
            subtitle="Cambiar imagen de perfil"
            onClick={() => setOpenAvatar(true)}
          />

          <DropdownMenuSeparator className="mx-3 my-1 bg-[#E4E9E3]" />

          <DropdownMenuItem
            onClick={() => logout()}
            className="mx-2 mb-2 mt-1 cursor-pointer rounded-xl px-3 py-3 text-[#1D4F36] transition-colors focus:bg-[#F1F7EA] focus:text-[#1D4F36]"
          >
            <LogOut className="mr-3 h-4 w-4 text-[#1D4F36]" />
            <span className="text-sm font-medium">Salir</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog open={openPwd} onOpenChange={setOpenPwd} />
      <ChangeEmailDialog
        currentEmail={email}
        open={openEmail}
        onOpenChange={setOpenEmail}
      />
      <ChangeAvatarDialog open={openAvatar} onOpenChange={setOpenAvatar} />
    </>
  );
}
