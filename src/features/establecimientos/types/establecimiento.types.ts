export type HorarioEstablecimiento = {
  id?: string;
  diaSemana: string;
  horaApertura: string;
  horaCierre: string;
  cerrado: boolean;
};

export type Establecimiento = {
  id: string;
  nombre: string;
  direccion: string;
  localidad: string | null;
  provincia: string | null;
  imagenUrl: string | null;
  email: string | null;
  telefono: string | null;
  celular: string | null;
  estado: string;
  observacion: string | null;
  barrio?: string | null;
  horarios: HorarioEstablecimiento[];
  actividades: Array<{
    id: string;
    nombre: string;
    estadoTexto?: string | null;
  }>;
};

export type EstablecimientoPayload = Omit<
  Establecimiento,
  "id" | "actividades"
>;
