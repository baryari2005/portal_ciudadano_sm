export type CurrentUser = {
  id: string;
  userId?: string | null;
  email: string;
  nombre?: string | null;
  apellido?: string | null;
  avatarUrl?: string | null;
  rol?: { id: string; nombre: string };
  permisos?: string[];
};
