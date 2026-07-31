import type {
  CreateProfesorInput as CreateInput,
  ProfesorFilters as Filters,
  UpdateProfesorInput as UpdateInput,
} from "../schemas/profesor.schema";

export type ProfesorEstado = "ACTIVO" | "INACTIVO" | "SUSPENDIDO";

export type ProfesorUsuarioResumen = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  email: string;
  telefono: string | null;
  avatarUrl: string | null;
  rol: { codigo: string; nombre: string };
};

export type Profesor = {
  id: string;
  usuarioId: string;
  especialidad: string | null;
  descripcion: string | null;
  matricula: string | null;
  fotoUrl: string | null;
  estado: ProfesorEstado;
  createdAt: string;
  updatedAt: string;
  usuario: ProfesorUsuarioResumen;
};

export type UsuarioDisponible = ProfesorUsuarioResumen;
export type CreateProfesorInput = CreateInput;
export type UpdateProfesorInput = UpdateInput;
export type ProfesorFilters = Filters;

export type ProfesorListResponse = {
  data: Profesor[];
  meta: { total: number; page: number; pageSize: number; pageCount: number };
};
