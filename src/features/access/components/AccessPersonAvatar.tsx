"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import type { AccessPerson } from "../types/access.types";

type Props = {
  person: AccessPerson;
  size?: "md" | "lg";
};

const sizeClasses = {
  md: "h-16 w-16 text-xl",
  lg: "h-24 w-24 text-3xl",
};

export function getAccessPersonName(person: AccessPerson) {
  return (
    [person.nombre, person.apellido].filter(Boolean).join(" ").trim() ||
    "Persona sin nombre"
  );
}

export function getAccessPersonFirstName(person: AccessPerson) {
  return person.nombre?.trim() || "Sin registrar";
}

export function getAccessPersonLastName(person: AccessPerson) {
  return person.apellido?.trim() || "Sin registrar";
}

export function getAccessPersonInitials(person: AccessPerson) {
  const fullName = getAccessPersonName(person);

  return (
    fullName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "US"
  );
}

export function AccessPersonAvatar({ person, size = "md" }: Props) {
  const fullName = getAccessPersonName(person);

  return (
    <Avatar
      aria-label={fullName}
      className={cn(
        "shrink-0 rounded-full border border-[#DDE8D7] bg-[#00522C] shadow-sm",
        sizeClasses[size],
      )}
    >
      <AvatarImage src={person.profilePhotoUrl ?? undefined} alt={`Foto de identidad de ${fullName}`} />
      <AvatarFallback className="bg-[#00522C] font-extrabold text-white">
        {getAccessPersonInitials(person)}
      </AvatarFallback>
    </Avatar>
  );
}
