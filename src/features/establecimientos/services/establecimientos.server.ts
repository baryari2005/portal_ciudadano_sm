import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

import type { EstablecimientoInput } from "../schemas/establecimiento.schema";

export class EstablecimientoConflictError extends Error {
  status = 409;

  constructor(message: string) {
    super(message);
    this.name = "EstablecimientoConflictError";
  }
}

const establecimientoInclude = {
  horarios: { orderBy: { diaSemana: "asc" as const } },
  horariosActividad: {
    distinct: ["actividadId"] as const,
    select: { actividad: { select: { id: true, nombre: true, estadoTexto: true, estado: true } } },
  },
} satisfies Prisma.EstablecimientoInclude;

function mapEstablecimiento<T extends { horariosActividad: { actividad: { id: string; nombre: string; estadoTexto: string | null; estado: string } }[] }>(
  record: T,
) {
  const { horariosActividad, ...rest } = record;
  return {
    ...rest,
    actividades: horariosActividad
      .map((item) => item.actividad)
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
  };
}

export async function listEstablecimientos() {
  const records = await prisma.establecimiento.findMany({
    orderBy: { nombre: "asc" },
    include: establecimientoInclude,
  });
  return records.map(mapEstablecimiento);
}

export async function getEstablecimiento(id: string) {
  const record = await prisma.establecimiento.findUnique({
    where: { id },
    include: establecimientoInclude,
  });
  return record ? mapEstablecimiento(record) : null;
}

export async function createEstablecimiento(input: EstablecimientoInput) {
  await assertUniqueEstablecimiento(input);

  return mapEstablecimiento(await prisma.establecimiento.create({
    data: {
      id: randomUUID(),
      nombre: input.nombre,
      direccion: input.direccion,
      localidad: input.localidad || null,
      provincia: input.provincia || null,
      direccionPlaceId: input.direccionPlaceId || null,
      direccionLat: input.direccionLat ?? null,
      direccionLng: input.direccionLng ?? null,
      codigoPostal: input.codigoPostal || null,
      imagenUrl: input.imagenUrl || null,
      email: input.email || null,
      telefono: input.telefono || null,
      celular: input.celular || null,
      estado: input.estado || "activo",
      observacion: input.observacion || null,
      barrio: input.barrio || null,
      horarios: {
        create: input.horarios.map((horario) => ({
          diaSemana: horario.diaSemana,
          horaApertura: horario.horaApertura,
          horaCierre: horario.horaCierre,
          cerrado: horario.cerrado,
        })),
      },
    },
    include: establecimientoInclude,
  }));
}

export async function updateEstablecimiento(
  id: string,
  input: EstablecimientoInput,
) {
  return prisma.$transaction(async (tx) => {
    await assertUniqueEstablecimiento(input, id);

    await tx.horarioEstablecimiento.deleteMany({
      where: { establecimientoId: id },
    });

    return mapEstablecimiento(await tx.establecimiento.update({
      where: { id },
      data: {
        nombre: input.nombre,
        direccion: input.direccion,
        localidad: input.localidad || null,
        provincia: input.provincia || null,
        direccionPlaceId: input.direccionPlaceId || null,
        direccionLat: input.direccionLat ?? null,
        direccionLng: input.direccionLng ?? null,
        codigoPostal: input.codigoPostal || null,
        imagenUrl: input.imagenUrl || null,
        email: input.email || null,
        telefono: input.telefono || null,
        celular: input.celular || null,
        estado: input.estado || "activo",
        observacion: input.observacion || null,
        barrio: input.barrio || null,
        horarios: {
          create: input.horarios.map((horario) => ({
            diaSemana: horario.diaSemana,
            horaApertura: horario.horaApertura,
            horaCierre: horario.horaCierre,
            cerrado: horario.cerrado,
          })),
        },
      },
      include: establecimientoInclude,
    }));
  });
}

async function assertUniqueEstablecimiento(
  input: EstablecimientoInput,
  currentId?: string,
) {
  const nombre = input.nombre.trim();
  const direccion = input.direccion.trim();

  const duplicate = await prisma.establecimiento.findFirst({
    where: {
      ...(currentId ? { id: { not: currentId } } : {}),
      OR: [
        { nombre: { equals: nombre, mode: "insensitive" } },
        { direccion: { equals: direccion, mode: "insensitive" } },
      ],
    },
    select: { nombre: true, direccion: true },
  });

  if (!duplicate) {
    return;
  }

  if (duplicate.nombre.toLowerCase() === nombre.toLowerCase()) {
    throw new EstablecimientoConflictError(
      "Ya existe un establecimiento con ese nombre.",
    );
  }

  throw new EstablecimientoConflictError(
    "Ya existe un establecimiento con esa direccion.",
  );
}

export async function deactivateEstablecimiento(id: string) {
  const current = await prisma.establecimiento.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!current)
    throw new EstablecimientoConflictError("El establecimiento no existe.");
  return mapEstablecimiento(await prisma.establecimiento.update({
    where: { id },
    data: { activo: false, estado: "inactivo" },
    include: establecimientoInclude,
  }));
}
