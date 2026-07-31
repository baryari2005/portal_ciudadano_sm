import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";

import { GET as list, POST as create } from "../src/app/api/profesores/route";
import {
  DELETE as deactivate,
  GET as detail,
  PATCH as update,
} from "../src/app/api/profesores/[id]/route";
import { GET as availableUsers } from "../src/app/api/profesores/usuarios-disponibles/route";
import { prisma } from "../src/lib/db";
import { signJwt } from "../src/lib/jwt";

const marker = `codex-prof-test-${Date.now()}`;
const results: string[] = [];
const ids = {
  roles: [] as number[],
  users: [] as string[],
  professors: [] as string[],
};

function request(path: string, token: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost/api${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function expectStatus(label: string, response: Response, status: number) {
  assert.equal(
    response.status,
    status,
    `${label}: ${response.status} ${await response.text()}`,
  );
  results.push(`${label}: ${status}`);
}

async function main() {
  const permissions = await prisma.permiso.findMany({
    where: { modulo: "profesores" },
  });
  assert.equal(permissions.length, 5);

  const allowedRole = await prisma.rol.create({
    data: { nombre: `${marker}-allowed`, descripcion: "TEMP" },
  });
  const deniedRole = await prisma.rol.create({
    data: { nombre: `${marker}-denied`, descripcion: "TEMP" },
  });
  ids.roles.push(allowedRole.id, deniedRole.id);
  await prisma.rolPermiso.createMany({
    data: permissions.map((permission) => ({
      rolId: allowedRole.id,
      permisoId: permission.id,
    })),
  });

  async function makeUser(
    suffix: string,
    roleId = allowedRole.id,
    deletedAt: Date | null = null,
  ) {
    const user = await prisma.usuario.create({
      data: {
        userId: `${marker}-${suffix}`,
        email: `${marker}-${suffix}@example.test`,
        nombre: suffix === "one" ? "Laura" : "Mario",
        apellido: suffix === "one" ? "Gómez" : "Pérez",
        documento: String(90000000 + ids.users.length),
        celular: "2604000000",
        rolId: roleId,
        estado: "ACTIVO",
        perfilCompleto: true,
        deletedAt,
      },
    });
    ids.users.push(user.id);
    return user;
  }

  const one = await makeUser("one");
  const two = await makeUser("two");
  const deleted = await makeUser("deleted", allowedRole.id, new Date());
  const denied = await makeUser("denied", deniedRole.id);
  const allowedToken = await signJwt({ uid: one.id, rid: allowedRole.id });
  const deniedToken = await signJwt({ uid: denied.id, rid: deniedRole.id });

  await expectStatus(
    "POST sin permiso",
    await create(
      request("/profesores", deniedToken, "POST", { usuarioId: one.id }),
    ),
    403,
  );
  await expectStatus(
    "GET sin permiso",
    await list(request("/profesores", deniedToken)),
    403,
  );
  await expectStatus(
    "Usuarios disponibles sin permiso",
    await availableUsers(
      request("/profesores/usuarios-disponibles", deniedToken),
    ),
    403,
  );
  await expectStatus(
    "Usuario inexistente",
    await create(
      request("/profesores", allowedToken, "POST", { usuarioId: randomUUID() }),
    ),
    422,
  );
  await expectStatus(
    "Usuario eliminado",
    await create(
      request("/profesores", allowedToken, "POST", { usuarioId: deleted.id }),
    ),
    422,
  );
  await expectStatus(
    "Foto insegura",
    await create(
      request("/profesores", allowedToken, "POST", {
        usuarioId: two.id,
        fotoUrl: "javascript:alert(1)",
      }),
    ),
    400,
  );

  const createOne = await create(
    request("/profesores", allowedToken, "POST", { usuarioId: one.id }),
  );
  await expectStatus("Crear sin especialidad", createOne.clone(), 201);
  const professorOne = (await createOne.json()).data;
  ids.professors.push(professorOne.id);
  await expectStatus(
    "Usuario duplicado",
    await create(
      request("/profesores", allowedToken, "POST", { usuarioId: one.id }),
    ),
    409,
  );

  const createTwo = await create(
    request("/profesores", allowedToken, "POST", {
      usuarioId: two.id,
      especialidad: "Yoga",
      descripcion: "Reseña profesional",
      matricula: " MAT 123 ",
      fotoUrl: "/images/test.jpg",
    }),
  );
  await expectStatus("Crear perfil completo", createTwo.clone(), 201);
  const professorTwo = (await createTwo.json()).data;
  ids.professors.push(professorTwo.id);

  await expectStatus(
    "Listar",
    await list(request("/profesores", allowedToken)),
    200,
  );
  await expectStatus(
    "Detalle",
    await detail(request(`/profesores/${professorTwo.id}`, allowedToken), {
      params: Promise.resolve({ id: professorTwo.id }),
    }),
    200,
  );
  for (const [label, value] of [
    ["nombre", "Laura"],
    ["apellido", "Gómez"],
    ["DNI", one.documento!],
    ["email", one.email],
    ["especialidad", "Yoga"],
  ]) {
    const response = await list(
      request(`/profesores?search=${encodeURIComponent(value)}`, allowedToken),
    );
    assert.equal(response.status, 200);
    assert.ok(((await response.json()).data as unknown[]).length > 0);
    results.push(`Buscar por ${label}: OK`);
  }
  await expectStatus(
    "Filtrar por estado",
    await list(request("/profesores?estado=ACTIVO", allowedToken)),
    200,
  );

  const personalBefore = await prisma.usuario.findUniqueOrThrow({
    where: { id: two.id },
    select: { nombre: true, apellido: true, documento: true, email: true },
  });
  await expectStatus(
    "Editar campos",
    await update(
      request(`/profesores/${professorTwo.id}`, allowedToken, "PATCH", {
        especialidad: "Natación",
        descripcion: "Actualizada",
        matricula: "MN 99",
        fotoUrl: "https://example.test/foto.jpg",
      }),
      { params: Promise.resolve({ id: professorTwo.id }) },
    ),
    200,
  );
  await expectStatus(
    "Quitar matrícula",
    await update(
      request(`/profesores/${professorTwo.id}`, allowedToken, "PATCH", {
        matricula: "",
      }),
      { params: Promise.resolve({ id: professorTwo.id }) },
    ),
    200,
  );
  await expectStatus(
    "PATCH vacío",
    await update(
      request(`/profesores/${professorTwo.id}`, allowedToken, "PATCH", {}),
      { params: Promise.resolve({ id: professorTwo.id }) },
    ),
    400,
  );
  await expectStatus(
    "usuarioId inmutable",
    await update(
      request(`/profesores/${professorTwo.id}`, allowedToken, "PATCH", {
        usuarioId: one.id,
      }),
      { params: Promise.resolve({ id: professorTwo.id }) },
    ),
    400,
  );
  assert.deepEqual(
    await prisma.usuario.findUniqueOrThrow({
      where: { id: two.id },
      select: { nombre: true, apellido: true, documento: true, email: true },
    }),
    personalBefore,
  );
  results.push("Datos personales inalterados: OK");

  await expectStatus(
    "PATCH sin permiso",
    await update(
      request(`/profesores/${professorTwo.id}`, deniedToken, "PATCH", {
        especialidad: "No",
      }),
      { params: Promise.resolve({ id: professorTwo.id }) },
    ),
    403,
  );
  await expectStatus(
    "DELETE sin permiso",
    await deactivate(
      request(`/profesores/${professorTwo.id}`, deniedToken, "DELETE"),
      { params: Promise.resolve({ id: professorTwo.id }) },
    ),
    403,
  );
  await expectStatus(
    "Desactivar",
    await deactivate(
      request(`/profesores/${professorTwo.id}`, allowedToken, "DELETE"),
      { params: Promise.resolve({ id: professorTwo.id }) },
    ),
    200,
  );
  assert.equal(
    (
      await prisma.profesor.findUniqueOrThrow({
        where: { id: professorTwo.id },
      })
    ).estado,
    "INACTIVO",
  );
  await expectStatus(
    "Reactivar",
    await update(
      request(`/profesores/${professorTwo.id}`, allowedToken, "PATCH", {
        estado: "ACTIVO",
      }),
      { params: Promise.resolve({ id: professorTwo.id }) },
    ),
    200,
  );
  await expectStatus(
    "Suspender",
    await update(
      request(`/profesores/${professorTwo.id}`, allowedToken, "PATCH", {
        estado: "SUSPENDIDO",
      }),
      { params: Promise.resolve({ id: professorTwo.id }) },
    ),
    200,
  );
  assert.equal(
    await prisma.profesor.count({ where: { id: professorTwo.id } }),
    1,
  );
  results.push("Baja lógica conserva perfil: OK");
  await expectStatus(
    "Usuarios disponibles autorizado",
    await availableUsers(
      request("/profesores/usuarios-disponibles", allowedToken),
    ),
    200,
  );

  console.log(results.join("\n"));
}

main()
  .finally(async () => {
    await prisma.profesor.deleteMany({ where: { id: { in: ids.professors } } });
    await prisma.usuario.deleteMany({ where: { id: { in: ids.users } } });
    await prisma.rolPermiso.deleteMany({ where: { rolId: { in: ids.roles } } });
    await prisma.rol.deleteMany({ where: { id: { in: ids.roles } } });
    const leftovers = {
      profesores: await prisma.profesor.count({
        where: { id: { in: ids.professors } },
      }),
      usuarios: await prisma.usuario.count({
        where: { userId: { startsWith: marker } },
      }),
      roles: await prisma.rol.count({
        where: { nombre: { startsWith: marker } },
      }),
    };
    console.log(`Limpieza temporal: ${JSON.stringify(leftovers)}`);
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
