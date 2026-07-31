type RawRecord = Record<string, unknown>;

type NormalizedUser = {
  userId: string | null;
  email: string | null;
  nombre: string | null;
  apellido: string | null;
  fechaNacimiento: string | null;
  genero: string | null;
  estadoCivil: string | null;
  nacionalidad: string | null;
  documentType: string | null;
  documentNumber: string | null;
  cuil: string | null;
  celular: string | null;
  domicilio: string | null;
  codigoPostal: string | null;
  password: string | null;
};

type NormalizedLegajo = {
  employeeNumber: number | null;
  admissionDate: string | null;
  terminationDate: string | null;
  employmentStatus: string;
  contractType: string | null;
  position: string | null;
  area: string | null;
  department: string | null;
  category: string | null;
  notes: string | null;
  matriculaProvincial: string | null;
  matriculaNacional: string | null;
};

type NormalizedRawBody = {
  user: NormalizedUser;
  legajo?: NormalizedLegajo;
};

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function getNumber(value: unknown): number | null {
  if (value == null || value === "") return null;

  const parsed =
    typeof value === "number" ? value : Number(String(value).trim());

  return Number.isFinite(parsed) ? parsed : null;
}

function hasAnyLegajoData(raw: RawRecord) {
  return (
    raw.legajo != null ||
    raw.numeroLegajo != null ||
    raw.fechaIngreso != null ||
    raw.fechaEgreso != null ||
    raw.puesto != null ||
    raw.matriculaProvincial != null ||
    raw.matriculaNacional != null ||
    raw.estadoLaboral != null ||
    raw.tipoContrato != null ||
    raw.area != null ||
    raw.departamento != null ||
    raw.categoria != null ||
    raw.observaciones != null
  );
}

export const normalizeEmail = (e?: string | null) =>
  (e ?? "").trim().toLowerCase() || undefined;

export const cuilDigits = (v?: string | null) =>
  (v ?? "").replace(/\D+/g, "") || undefined;

export const formatCuil = (v?: string | null): string | null => {
  const d = (v ?? "").replace(/\D+/g, "");
  if (d.length !== 11) return (v ?? null) ? String(v) : null;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
};

export const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

export const fromYMDorISO = (s?: string | null): Date | null => {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [year, month, day] = t.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const titleCase = (raw?: string | null): string | null => {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;

  const cap = (w: string) =>
    w
      .split("-")
      .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
      .join("-");

  return s.split(/\s+/).map(cap).join(" ");
};

export const ensureMatriculaPrefix = (
  raw?: string | null,
  prefix: "MP" | "MN" = "MP",
): string | null => {
  if (!raw) return null;
  const up = String(raw).toUpperCase().trim();
  if (!up) return null;

  const letters = prefix.split("").join("[\\s.\\-\\/]*");
  const re = new RegExp(`^${letters}[\\s.\\-\\/]*`, "i");
  const rest = up.replace(re, "").trim();

  return rest ? `${prefix} ${rest}` : prefix;
};

export function normalizeRawBody(raw: unknown): NormalizedRawBody {
  if (isRecord(raw) && "user" in raw) {
    return raw as NormalizedRawBody;
  }

  const source: RawRecord = isRecord(raw) ? raw : {};
  const rawLegajo = isRecord(source.legajo) ? source.legajo : null;

  return {
    user: {
      userId: getString(source.userId),
      email: getString(source.email),
      nombre: getString(source.nombre),
      apellido: getString(source.apellido),
      fechaNacimiento: getString(source.fechaNacimiento),
      genero: getString(source.genero),
      estadoCivil: getString(source.estadoCivil),
      nacionalidad: getString(source.nacionalidad),
      documentType: getString(source.tipoDocumento),
      documentNumber: getString(source.documento),
      cuil: getString(source.cuil),
      celular: getString(source.celular),
      domicilio: getString(source.domicilio),
      codigoPostal: getString(source.codigoPostal),
      password: getString(source.password),
    },
    legajo: hasAnyLegajoData(source)
      ? {
          employeeNumber: rawLegajo
            ? getNumber(rawLegajo.numeroLegajo ?? rawLegajo.employeeNumber)
            : getNumber(source.numeroLegajo),
          admissionDate: getString(source.fechaIngreso),
          terminationDate: getString(source.fechaEgreso),
          employmentStatus: getString(source.estadoLaboral) ?? "ACTIVO",
          contractType: getString(source.tipoContrato),
          position: getString(source.puesto),
          area: getString(source.area),
          department: getString(source.departamento),
          category: getString(source.categoria),
          notes: getString(source.observaciones),
          matriculaProvincial: getString(source.matriculaProvincial),
          matriculaNacional: getString(source.matriculaNacional),
        }
      : undefined,
  };
}
