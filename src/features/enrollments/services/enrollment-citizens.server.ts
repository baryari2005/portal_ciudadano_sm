import { Prisma } from "@prisma/client";
import { hashQrToken } from "@/features/attendance-qr/services/qr-credentials.server";
import { prisma } from "@/lib/db";
import { CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";

const citizenRole: Prisma.RolWhereInput = {
  OR: [
    { codigo: { in: ["user", "citizen"] } },
    { nombre: { contains: "ciudad", mode: "insensitive" } },
  ],
};

const citizenSelect = {
  id: true,
  userId: true,
  nombre: true,
  apellido: true,
  documento: true,
  email: true,
  avatarUrl: true,
  fotoPerfilUrl: true,
  celular: true,
  domicilio: true,
  localidad: true,
  provincia: true,
  codigoPostal: true,
  fechaNacimiento: true,
  estado: true,
} satisfies Prisma.UsuarioSelect;

export type EnrollmentCitizen = {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  documentNumber: string | null;
  email: string;
  avatarUrl: string | null;
  identityPhotoUrl: string | null;
  phone: string | null;
  address: string | null;
  locality: string | null;
  province: string | null;
  postalCode: string | null;
  birthDate: string | null;
};

function mapCitizen(user: Prisma.UsuarioGetPayload<{ select: typeof citizenSelect }>): EnrollmentCitizen {
  return {
    id: user.id,
    userId: user.userId,
    firstName: user.nombre,
    lastName: user.apellido,
    fullName: [user.nombre, user.apellido].filter(Boolean).join(" ") || user.userId,
    documentNumber: user.documento,
    email: user.email,
    avatarUrl: user.avatarUrl,
    identityPhotoUrl: user.fotoPerfilUrl,
    phone: user.celular,
    address: user.domicilio,
    locality: user.localidad,
    province: user.provincia,
    postalCode: user.codigoPostal,
    birthDate: user.fechaNacimiento?.toISOString().slice(0, 10) ?? null,
  };
}

export async function searchEnrollmentCitizens(query: string, page = 1, pageSize = 6) {
  const q = query.trim().replace(/\s+/g, " ");
  const documentQuery = q.replace(/[.\s-]/g, "");
  const nameParts = q.split(" ").filter(Boolean);
  const where: Prisma.UsuarioWhereInput = {
    deletedAt: null,
    estado: "ACTIVO",
    rol: citizenRole,
    ...(q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { apellido: { contains: q, mode: "insensitive" } },
            { documento: { contains: documentQuery } },
            { email: { contains: q, mode: "insensitive" } },
            { userId: { contains: q, mode: "insensitive" } },
            ...(nameParts.length > 1 ? [{ AND: nameParts.map((part) => ({ OR: [{ nombre: { contains: part, mode: "insensitive" as const } }, { apellido: { contains: part, mode: "insensitive" as const } }] })) }] : []),
          ],
        }
      : {}),
  };
  const [total, users] = await prisma.$transaction([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      select: citizenSelect,
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    items: users.map(mapCitizen),
    meta: { total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

type PhysicalCardPayload = { type: "MASM_ACCESS_CARD"; userId: string; username: string; dni: string };

function parsePhysicalCard(value: string): PhysicalCardPayload | null {
  try {
    const payload = JSON.parse(value) as Partial<PhysicalCardPayload>;
    return payload.type === "MASM_ACCESS_CARD" && typeof payload.userId === "string" && typeof payload.username === "string" && typeof payload.dni === "string"
      ? (payload as PhysicalCardPayload)
      : null;
  } catch {
    return null;
  }
}

export async function identifyEnrollmentCitizen(qrToken: string) {
  const token = qrToken.trim();
  if (!token) throw new CatalogValidationError("Escaneá o ingresá una credencial QR.");
  const physical = parsePhysicalCard(token);
  let user: Prisma.UsuarioGetPayload<{ select: typeof citizenSelect }> | null = null;

  if (physical) {
    user = await prisma.usuario.findFirst({
      where: { id: physical.userId, userId: physical.username, documento: physical.dni },
      select: citizenSelect,
    });
  } else {
    const tokenHash = hashQrToken(token);
    const persistent = await prisma.usuarioQrCredencial.findUnique({
      where: { tokenHash },
      select: { estado: true, usuario: { select: citizenSelect } },
    });
    if (persistent) {
      if (persistent.estado !== "ACTIVO") throw new CatalogValidationError("La credencial QR está revocada.");
      user = persistent.usuario;
    } else {
      const digital = await prisma.accesoQrDigital.findUnique({
        where: { tokenHash },
        select: { estado: true, usuario: { select: citizenSelect } },
      });
      if (digital) {
        if (digital.estado !== "ACTIVO") throw new CatalogValidationError("El QR digital ya no está vigente.");
        user = digital.usuario;
      }
    }
  }

  if (!user) throw new CatalogNotFoundError("No encontramos un ciudadano asociado a ese QR.");
  if (user.estado !== "ACTIVO") throw new CatalogValidationError("El ciudadano no está activo.");
  const roleMatch = await prisma.usuario.count({ where: { id: user.id, rol: citizenRole } });
  if (!roleMatch) throw new CatalogValidationError("El QR no pertenece a un ciudadano.");
  return mapCitizen(user);
}
