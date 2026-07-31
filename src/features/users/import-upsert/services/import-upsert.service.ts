import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import {
  EstadoLaboral,
  Legajo,
  Prisma,
  TipoContrato,
  Usuario,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { ImportUpsertBodyDto } from "../schemas/import-upsert.schema";
import {
  cuilDigits,
  ensureMatriculaPrefix,
  formatCuil,
  fromYMDorISO,
  normalizeEmail,
  titleCase,
} from "../lib/import-upsert.normalize";

type CreateOrUpdateImportedUserResult = {
  user: Usuario;
  legajo: Legajo | null;
  tempPassword?: string;
};

export async function findTargetUser(input: {
  cuil?: string | null;
  userId?: string;
  email?: string;
}) {
  const cuilNum = cuilDigits(input.cuil);
  const cuilFmt = formatCuil(input.cuil);

  if (cuilNum) {
    const byCuil = await prisma.usuario.findFirst({
      where: { OR: [{ cuil: cuilNum }, { cuil: cuilFmt ?? "" }] },
    });
    if (byCuil) return byCuil;
  }

  if (input.userId) {
    const byUserId = await prisma.usuario.findFirst({
      where: { userId: input.userId },
    });
    if (byUserId) return byUserId;
  }

  if (input.email) {
    const byEmail = await prisma.usuario.findFirst({
      where: { email: input.email },
    });
    if (byEmail) return byEmail;
  }

  return null;
}

export async function createOrUpdateImportedUser(
  dto: ImportUpsertBodyDto,
  opts: { setTemp: boolean },
): Promise<CreateOrUpdateImportedUserResult> {
  const { user: userDto, legajo: legajoDto } = dto;

  const emailNorm = normalizeEmail(userDto.email);
  const userIdNorm = userDto.userId?.trim();
  const cuilNum = cuilDigits(userDto.cuil);
  const cuilFmt = formatCuil(userDto.cuil);

  let targetUser = await findTargetUser({
    cuil: userDto.cuil,
    userId: userIdNorm,
    email: emailNorm,
  });

  let tempPassword: string | undefined;

  if (targetUser) {
    const dataToUpdate: Prisma.UsuarioUncheckedUpdateInput = {
      deletedAt: null,
      rolId: 1,
    };

    if (emailNorm) dataToUpdate.email = emailNorm;
    if (userDto.nombre !== undefined)
      dataToUpdate.nombre = titleCase(userDto.nombre);
    if (userDto.apellido !== undefined)
      dataToUpdate.apellido = titleCase(userDto.apellido);

    if ("fechaNacimiento" in userDto) {
      dataToUpdate.fechaNacimiento = fromYMDorISO(userDto.fechaNacimiento);
    }
    if ("genero" in userDto) dataToUpdate.genero = userDto.genero ?? null;
    if ("estadoCivil" in userDto)
      dataToUpdate.estadoCivil = userDto.estadoCivil ?? null;
    if ("nacionalidad" in userDto)
      dataToUpdate.nacionalidad = userDto.nacionalidad ?? null;

    if ("celular" in userDto) dataToUpdate.celular = userDto.celular ?? null;
    if ("domicilio" in userDto)
      dataToUpdate.domicilio = userDto.domicilio ?? null;
    if ("codigoPostal" in userDto)
      dataToUpdate.codigoPostal = userDto.codigoPostal ?? null;

    if ("documentType" in userDto)
      dataToUpdate.tipoDocumento = userDto.documentType ?? null;
    if ("documentNumber" in userDto)
      dataToUpdate.documento = userDto.documentNumber ?? null;
    if ("cuil" in userDto) dataToUpdate.cuil = cuilFmt ?? cuilNum ?? null;

    if (opts.setTemp) {
      tempPassword = userDto.password || randomBytes(6).toString("base64url");
      dataToUpdate.password = await hash(tempPassword, 12);
      dataToUpdate.mustChangePassword = true;
    }

    try {
      targetUser = await prisma.usuario.update({
        where: { id: targetUser.id },
        data: dataToUpdate,
      });
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002" &&
        dataToUpdate.email
      ) {
        const { ...rest } = dataToUpdate;
        targetUser = await prisma.usuario.update({
          where: { id: targetUser.id },
          data: rest,
        });
      } else {
        throw e;
      }
    }
  } else {
    tempPassword = userDto.password || randomBytes(6).toString("base64url");
    const fallbackUserId =
      userIdNorm || (emailNorm ? emailNorm.split("@")[0] : `u_${Date.now()}`);
    const fallbackEmail = emailNorm || `${fallbackUserId}@example.com`;

    targetUser = await prisma.usuario.create({
      data: {
        userId: userDto.userId ?? fallbackUserId,
        email: userDto.email ?? fallbackEmail,
        password: await hash(tempPassword, 12),
        mustChangePassword: true,

        nombre: titleCase(userDto.nombre),
        apellido: titleCase(userDto.apellido),

        rolId: 1,

        fechaNacimiento: fromYMDorISO(userDto.fechaNacimiento),
        genero: userDto.genero ?? null,
        estadoCivil: userDto.estadoCivil ?? null,
        nacionalidad: userDto.nacionalidad ?? null,

        celular: userDto.celular ?? null,
        domicilio: userDto.domicilio ?? null,
        codigoPostal: userDto.codigoPostal ?? null,

        tipoDocumento: userDto.documentType ?? null,
        documento: userDto.documentNumber ?? null,
        cuil: cuilFmt ?? cuilNum ?? null,
      },
    });
  }

  let savedLegajo: Legajo | null = null;

  if (legajoDto) {
    const data: Prisma.LegajoUncheckedCreateInput = {
      usuarioId: targetUser.id,
      numeroLegajo: legajoDto.employeeNumber ?? null,
      fechaIngreso: fromYMDorISO(legajoDto.admissionDate),
      fechaEgreso: fromYMDorISO(legajoDto.terminationDate),
      estadoLaboral: (legajoDto.employmentStatus as EstadoLaboral) ?? "ACTIVO",
      tipoContrato: (legajoDto.contractType as TipoContrato) ?? null,
      puesto: legajoDto.position ?? null,
      area: legajoDto.area ?? null,
      departamento: legajoDto.department ?? null,
      categoria: legajoDto.category ?? null,
      observaciones: legajoDto.notes ?? null,
      matriculaProvincial: ensureMatriculaPrefix(
        legajoDto.matriculaProvincial,
        "MP",
      ),
      matriculaNacional: ensureMatriculaPrefix(
        legajoDto.matriculaNacional,
        "MN",
      ),
    };

    savedLegajo = await prisma.legajo.upsert({
      where: { usuarioId: targetUser.id },
      update: data,
      create: data,
    });
  }

  return {
    user: targetUser,
    legajo: savedLegajo,
    tempPassword,
  };
}

export function mapImportUpsertError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = Array.isArray(error.meta?.target)
      ? error.meta?.target.join(", ")
      : String(error.meta?.target ?? "campo desconocido");

    return {
      status: 409,
      message: `Conflicto por valor único duplicado en: ${target}`,
    };
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues?: unknown[] }).issues)
  ) {
    return {
      message: "Error de validación",
      status: 400,
      issues: (error as { issues: unknown[] }).issues,
    };
  }

  return {
    message: error instanceof Error ? error.message : "Invalid body",
    status: 400,
  };
}
