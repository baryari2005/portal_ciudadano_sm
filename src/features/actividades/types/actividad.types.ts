import type { Establecimiento } from "@/features/establecimientos/types/establecimiento.types";
import type {
  ActividadNivel,
  ActividadEstado,
  ActividadInput,
  UpdateActividadInput,
} from "../schemas/actividad.schema";
import type { ActivityRequirement } from "@/features/requirements/types/requirement.types";

export type HorarioActividad = {
  id?: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
};

export type ActividadAsignado = {
  id?: string;
  usuarioId: string;
  funcion: string | null;
  activo: boolean;
  usuario?: {
    id: string;
    nombre: string | null;
    apellido: string | null;
    userId: string;
    avatarUrl: string | null;
  };
};

export type Actividad = {
  id: string;
  nombre: string;
  descripcionCorta: string | null;
  descripcion: string | null;
  imagenUrl: string | null;
  color: string | null;
  nivel: ActividadNivel | null;
  edadMinima: number | null;
  edadMaxima: number | null;
  requiereCertificadoMedico: boolean;
  requiereAutorizacion: boolean;
  esGratuita: boolean;
  precio: string | null;
  modalidadInscripcion: import("../schemas/actividad.schema").ModalidadInscripcion;
  duracionPeriodoMeses: number | null;
  horasCancelacionJustificada: number;
  modalidadOperacion: import("../schemas/actividad.schema").ActividadModalidad;
  vigenciaReserva: import("../schemas/actividad.schema").VigenciaReserva;
  duracionTurnoMinutos: number | null;
  intervaloTurnoMinutos: number;
  anticipacionReservaDias: number;
  limiteReservasPorUsuario: number | null;
  requiereReserva: boolean;
  establecimientoId: string;
  establecimiento: Pick<Establecimiento, "id" | "nombre" | "direccion">;
  cupo: number | null;
  cupoMaximo?: number;
  estadoTexto: string | null;
  estado: ActividadEstado;
  categoria: string;
  categoriaActividadId: string | null;
  categoriaActividad: ActividadCategoriaResumen | null;
  publicosObjetivo: ActividadPublicoObjetivoResumen[];
  horarios: HorarioActividad[];
  asignados: ActividadAsignado[];
  requirements: ActivityRequirement[];
};

export type ActividadCategoriaResumen = {
  id: string;
  nombre: string;
  slug: string;
  color: string | null;
  icono: string | null;
  activo: boolean;
};

export type ActividadPublicoObjetivoResumen = {
  id: string;
  nombre: string;
  slug: string;
  activo: boolean;
};

export type ActividadPayload = ActividadInput;
export type CreateActividadInput = ActividadInput;
export type UpdateActividadPayload = UpdateActividadInput;

export type ActividadFilters = {
  search?: string;
  nombre?: string;
  estado?: ActividadEstado;
  establecimientoId?: string;
  categoriaActividadId?: string;
  publicoObjetivoId?: string;
  nivel?: ActividadNivel;
  esGratuita?: boolean;
  requiereCertificadoMedico?: boolean;
};

export type { ActividadNivel };
export type { ActividadEstado };
