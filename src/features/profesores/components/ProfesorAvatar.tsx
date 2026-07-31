import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Profesor } from "../types/profesor.types";

export function ProfesorAvatar({
  profesor,
  className = "h-14 w-14",
}: {
  profesor: Pick<Profesor, "fotoUrl" | "usuario">;
  className?: string;
}) {
  const name =
    [profesor.usuario.nombre, profesor.usuario.apellido]
      .filter(Boolean)
      .join(" ") || profesor.usuario.email;
  const initials =
    [profesor.usuario.nombre?.[0], profesor.usuario.apellido?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "PR";
  return (
    <Avatar aria-label={name} className={`${className} shrink-0 rounded-xl border border-[var(--brand-border-soft)] bg-[var(--brand-primary)] shadow-sm`}>
      <AvatarImage
        src={profesor.fotoUrl || profesor.usuario.avatarUrl || undefined}
        alt={name}
      />
      <AvatarFallback className="rounded-xl bg-[var(--brand-primary)] font-extrabold text-white">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
