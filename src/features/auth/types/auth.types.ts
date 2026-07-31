export type PermissionDTO = {
  modulo: string;
  accion: string;
};

export type UserDTO = {
  id: string;
  userId: string | null;
  email?: string;
  nombre?: string;
  apellido?: string;
  mustChangePassword?: boolean;
  perfilCompleto?: boolean;
  estado?: "PENDIENTE" | "ACTIVO" | "RECHAZADO" | "BLOQUEADO";
  avatarUrl?: string | null;
  rol?: { id: number; codigo?: string | null; nombre: string } | null;
  permisos?: PermissionDTO[];
};

export type LoginUserDTO = Pick<
  UserDTO,
  "id" | "userId" | "email" | "nombre" | "apellido"
> & {
  rol?: {
    id: number;
    nombre: string;
  } | null;
  permisos: PermissionDTO[];
};

export type LoginBody = {
  userId: string;
  password: string;
};

export type LoginResult = {
  ok: boolean;
  message?: string;
};

export type AuthMeResponse = {
  user?: UserDTO | null;
};

export type AuthLoginResponse = {
  token?: string;
  accessToken?: string;
  redirectTo?: string | null;
  error?: string;
  user?: LoginUserDTO;
};
